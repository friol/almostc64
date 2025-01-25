/* floppy disk controller 1541 */

class fdc1541
{
    constructor()
    {
        this.done=false;

        this.motor_on=true;
        this.on_sync=false;
        this.byte_ready = false;
        this.byte_latch=0;
        this.write_protected=false;

        this.disk_change_seq=3;
        this.disk_change_cycle = 0;
        this.current_halftrack=2 * (18 - 1);	// Track 18

        this.last_byte_cycle=0;
        this.gcr_offset = 0;
        this.cycles_per_byte=30;
    
        this.MAX_NUM_HALFTRACKS = 84;
        this.DISK_CHANGE_SEQ_CYCLES = 500000;	// 0.5 s

        this.gcr_data=new Array();
        this.gcr_track_length=new Array();

        let i=0;
        for (i = 0; i < this.MAX_NUM_HALFTRACKS; i+=1) 
        {
            this.gcr_data[i] = new Array();
            this.gcr_track_length[i] = 0;
        }
    }

    loadG64disk(diskData)
    {
        let num_halftracks = diskData[9];
        console.log("g64 has "+num_halftracks+" half tracks");
    
        let track_offsets=new Array(this.MAX_NUM_HALFTRACKS * 4);
        for (var i=0;i<this.MAX_NUM_HALFTRACKS;i++)
        {
            track_offsets[(i*4)+0]=diskData[12+(i*4)+0];
            track_offsets[(i*4)+1]=diskData[12+(i*4)+1];
            track_offsets[(i*4)+2]=diskData[12+(i*4)+2];
            track_offsets[(i*4)+3]=diskData[12+(i*4)+3];
        }

        for (var halftrack = 0; halftrack < num_halftracks; halftrack++) 
        {
            let offset = ( track_offsets[halftrack * 4 + 0] <<  0)
                            | ( track_offsets[halftrack * 4 + 1] <<  8)
                            | ( track_offsets[halftrack * 4 + 2] << 16)
                            | ( track_offsets[halftrack * 4 + 3] << 24);
    
            if (offset == 0)
            {
                continue;
            }

            let length = diskData[offset] | (diskData[offset+1] << 8);

            this.gcr_track_length[halftrack] = length;
            this.gcr_data[halftrack] = new Array(length);

            for (var i=0;i<length;i++)
            {
                this.gcr_data[halftrack][i]=diskData[offset+2+i];
            }
        }

        console.log("G64 loading ends");
    }

    loadG64image(arr)
    {
        this.loadG64disk(arr);
    }

    moveHeadIn()
    {
        if (!this.motor_on) return;
	    if (this.current_halftrack >= (this.MAX_NUM_HALFTRACKS - 1)) return;

        console.log("fdc::head moves in");
        this.current_halftrack+=1;
    }

    moveHeadOut()
    {
        if (!this.motor_on) return;
        if (this.current_halftrack == 0) return;

        console.log("fdc::head moves out");
        this.current_halftrack-=1;
    }

    setMotor(value)
    {
        if (value==0) this.motor_on=false;
        else this.motor_on=true;
        console.log("fdc::motor:",this.motor_on);
    }

    setBitrate(rate)
    {
        //console.log("set bitrate "+rate);
        let cpb = [ 32, 30, 28, 26 ];
        this.cycles_per_byte = cpb[rate];
    }

    /* a lot of the following code is ported from Frodo - https://github.com/cebix/frodo4 */
    advance_disk_change_seq(cycle_counter)
    {
        if (this.disk_change_seq > 0)
        {
            // Time for next step in sequence?
            let elapsed = cycle_counter - this.disk_change_cycle;
            if (elapsed >= this.DISK_CHANGE_SEQ_CYCLES) 
            {
                this.disk_change_seq-=1;
                this.disk_change_cycle = cycle_counter;
            }
        }
    }
    
    rotateDisk(cycle_counter)
    {
        this.advance_disk_change_seq(cycle_counter);
    
        if (this.motor_on && (this.disk_change_seq == 0) && (this.gcr_data[this.current_halftrack].length>0)) 
        {
            let elapsed = cycle_counter - this.last_byte_cycle;
            let advance = Math.floor(elapsed / this.cycles_per_byte);
    
            if (advance > 0) 
            {
                let track_length = this.gcr_track_length[this.current_halftrack];
    
                this.gcr_offset += advance;
                while (this.gcr_offset >= track_length) 
                {
                    this.gcr_offset -= track_length;
                }
    
                let trkPos=this.gcr_offset;

                if (this.gcr_offset != 0) 
                {
                    this.on_sync = 
                    ((this.gcr_data[this.current_halftrack][(trkPos-1)%this.gcr_data[this.current_halftrack].length] & 0x03) == 0x03) && 
                     (this.gcr_data[this.current_halftrack][trkPos] == 0xff);
                } 
                else 
                {
                    this.on_sync = ((this.gcr_data[this.current_halftrack][track_length - 1] & 0x03) == 0x03) && (this.gcr_data[this.current_halftrack][trkPos] == 0xff);
                }
                
                if (!this.on_sync) 
                {
                    if (!this.byte_ready) 
                    {
                        this.byte_latch = this.gcr_data[this.current_halftrack][trkPos];
                        this.byte_ready = true;
                    }
                } 
                else 
                {
                    this.byte_ready = false;
                }
    
                this.last_byte_cycle += advance * this.cycles_per_byte;
            }
        } 
        else 
        {
            this.last_byte_cycle = cycle_counter;
            this.on_sync = false;
            this.byte_ready = false;
        }
    }
    
    syncFound(cycle_counter)
    {
        this.rotateDisk(cycle_counter);
        return this.on_sync;
    }

    byteReady(cycle_counter)
    {
        this.rotateDisk(cycle_counter);
        return this.byte_ready;
    }
    
    ReadGCRByte(cycle_counter)
    {
        this.rotateDisk(cycle_counter);
        this.byte_ready=false;
        return this.byte_latch;
    }

    WPSensorClosed(cycle_counter)
    {
        this.advance_disk_change_seq(cycle_counter);
    
        if ((this.disk_change_seq == 3) || (this.disk_change_seq == 1)) 
        {
            return true;
        } 
        else if (this.disk_change_seq == 2) 
        {
            return false;
        }
    
        return this.write_protected;
    }
}
