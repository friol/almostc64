
/* 
    1541 floppy disk controller & disk handling 
    a lot of the following code is ported from Frodo - https://github.com/cebix/frodo4 
*/

class fdc1541
{
    constructor()
    {
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

        this.sector_offset = 
        [
            0,
            0,21,42,63,84,105,126,147,168,189,210,231,252,273,294,315,336,
            357,376,395,414,433,452,471,
            490,508,526,544,562,580,
            598,615,632,649,666,
            683,700,717,734,751	// Tracks 36..40
        ];

        // GCR conversion table
        this.gcr_table = 
        [
            0x0a, 0x0b, 0x12, 0x13, 0x0e, 0x0f, 0x16, 0x17,
            0x09, 0x19, 0x1a, 0x1b, 0x0d, 0x1d, 0x1e, 0x15
        ];
    }

    diskSwapped(cycles)
    {
        this.disk_change_seq=3;
        this.disk_change_cycle = cycles;
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

    loadG64image(arr,cycles)
    {
        this.loadG64disk(arr);
        this.diskSwapped(cycles);
    }

    read_sector(track, sector, diskdata)
    {
        let retbuf=[];

        // Convert track/sector to byte offset in file
        let offset = (this.sector_offset[track] + sector) << 8;
    
        for (var i=0;i<256;i++)
        {
            retbuf[i]=diskdata[offset+i];
        }
        
        return retbuf;
    }

    gcr_conv4(fromArr,gcrPtr,halftrack,offset)
    {
        let g=0;
        let fromPtr=0;
    
        g = (this.gcr_table[fromArr[fromPtr] >> 4] << 5) | this.gcr_table[fromArr[fromPtr] & 15];
        this.gcr_data[halftrack][offset+gcrPtr] = g >> 2;
        gcrPtr+=1;
        this.gcr_data[halftrack][offset+gcrPtr] = (g << 6) & 0xc0;
        fromPtr+=1;
    
        g = (this.gcr_table[fromArr[fromPtr] >> 4] << 5) | this.gcr_table[fromArr[fromPtr] & 15];
        this.gcr_data[halftrack][offset+gcrPtr] |= (g >> 4) & 0x3f;
        gcrPtr+=1;
        this.gcr_data[halftrack][offset+gcrPtr] = (g << 4) & 0xf0;
        fromPtr+=1;
    
        g = (this.gcr_table[fromArr[fromPtr] >> 4] << 5) | this.gcr_table[fromArr[fromPtr] & 15];
        this.gcr_data[halftrack][offset+gcrPtr] |= (g >> 6) & 0x0f;
        gcrPtr+=1;
        this.gcr_data[halftrack][offset+gcrPtr] = (g << 2) & 0xfc;
        fromPtr+=1;
    
        g = (this.gcr_table[fromArr[fromPtr] >> 4] << 5) | this.gcr_table[fromArr[fromPtr] & 15];
        this.gcr_data[halftrack][offset+gcrPtr] |= (g >> 8) & 0x03;
        gcrPtr+=1;
        this.gcr_data[halftrack][offset+gcrPtr] = g;
    }    
    
    sector2gcr(track, sector, halftrack, offset,diskdata,id1,id2)
    {
        let gcrPtr=0;
        let buf=new Array(4);
    
        let block=this.read_sector(track,sector,diskdata);

        // Create GCR block header
        for (var b=0;b<5;b++)
        {
            this.gcr_data[halftrack][offset+gcrPtr+b]=0xff;
        }
        gcrPtr+=5;
    
        buf[0] = 0x08; // Header mark
        buf[1] = sector ^ track ^ id2 ^ id1;	// Checksum
        buf[2] = sector;
        buf[3] = track;

        this.gcr_conv4(buf,gcrPtr,halftrack,offset);
        gcrPtr += 5;
    
        buf[0] = id2;
        buf[1] = id1;
        buf[2] = 0x0f;
        buf[3] = 0x0f;

        this.gcr_conv4(buf,gcrPtr,halftrack,offset);
        gcrPtr += 5;
    
        // Gap
        for (var b=0;b<9;b++)
        {
            this.gcr_data[halftrack][offset+gcrPtr+b]=0x55;
        }
        gcrPtr+=9;
    
        // GCR data block
        // SYNC
        for (var b=0;b<5;b++)
        {
            this.gcr_data[halftrack][offset+gcrPtr+b]=0xff;
        }
        gcrPtr+=5;
    
        let sum=0;
        buf[0] = 0x07;					// Data mark
        buf[1] = block[0];
        sum =  buf[1];
        buf[2] = block[1];
        sum ^= buf[2];
        buf[3] = block[2];
        sum ^= buf[3];

        this.gcr_conv4(buf,gcrPtr,halftrack,offset);
        gcrPtr += 5;
    
        for (var i = 3; i < 255; i += 4) 
        {
            buf[0] = block[i];
            sum ^= buf[0];
            buf[1] = block[i+1];
            sum ^= buf[1];
            buf[2] = block[i+2];
            sum ^= buf[2];
            buf[3] = block[i+3];
            sum ^= buf[3];

            this.gcr_conv4(buf,gcrPtr,halftrack,offset);
            gcrPtr += 5;
        }
    
        buf[0] = block[255];
        sum ^= buf[0];
        buf[1] = sum; // Checksum
        buf[2] = 0;
        buf[3] = 0;

        this.gcr_conv4(buf,gcrPtr,halftrack,offset);
        gcrPtr += 5;
    
        // Gap
        for (var b=0;b<16;b++)
        {
            this.gcr_data[halftrack][offset+gcrPtr+b]=0x55;
        }
    }

    loadD64image(arr,cycles)
    {
        // Check length
        let size = arr.length;
        let num_tracks=0;
        let header_size=0;
        let NUM_SECTORS_35=683;
        let GCR_SECTOR_SIZE = 5 + 10 + 9 + 5 + 325 + 16;	// SYNC + Header + Gap + SYNC + Data + Gap

        // Number of sectors of each track
        let num_sectors = [
            0,
            21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,
            19,19,19,19,19,19,19,
            18,18,18,18,18,18,
            17,17,17,17,17,
            17,17,17,17,17		// Tracks 36..40
        ];
    
        if (size == NUM_SECTORS_35 * 256) 
        {
            // 35-track D64
            num_tracks = 35;
            header_size = 0;
        } 
        else 
        {
            alert("Only .d64 with 35 tracks and no error info are supported at the moment - disk size:"+size);
        }
    
        // Read BAM and get disk ID
        let bam=this.read_sector(18, 0, arr);
        let disk_id1 = bam[162];
        let disk_id2 = bam[163];

        // Create GCR encoded disk data from image
        for (var track = 1; track <= num_tracks; track+=1) 
        {
            // Allocate GCR data
            let halftrack = (track - 1) * 2;
    
            this.gcr_track_length[halftrack] = GCR_SECTOR_SIZE * num_sectors[track];
            this.gcr_data[halftrack] = new Array(this.gcr_track_length[halftrack]);
    
            // Convert track
            for (var sector = 0; sector < num_sectors[track]; sector+=1) 
            {
                this.sector2gcr(track, sector, halftrack, GCR_SECTOR_SIZE * sector,arr,disk_id1,disk_id2);
            }
        }

        console.log("D64 loading ends");

        this.diskSwapped(cycles);
    }

    //
    //
    //

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
