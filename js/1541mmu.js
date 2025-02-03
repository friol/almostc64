/* disk/1541 mmu */

class disk1541mmu
{
    constructor(via1,via2,cia1,cia2,fdc)
    {
        // 16kb of disk ROM
        this.diskROM=new Array();

        // 2kb of RAM
        this.diskRAM=new Array(0x800);
        for (var i = 0; i < 0x800; i++)
        {
            this.diskRAM[i]=0;
        }

        // are the roms loaded?
        this.romsLoaded=false;
        
        var thisInstance=this;
        $.ajax({
            url: "roms/dos1541-325302-01+901229-05.rom",type: "GET",processData: false,dataType: "binary",
            success: function(data) 
            {
                var arrayBuffer;
                var fileReader = new FileReader();
                fileReader.onload = function(event) 
                {
                    arrayBuffer = event.target.result;
                    var uint8ArrayNew  = new Uint8Array(arrayBuffer);
                    for (var c=0;c<0x4000;c++)
                    {
                        thisInstance.diskROM.push(uint8ArrayNew[c]);
                    }

                    console.log("1541 rom loaded.");
                    thisInstance.romsLoaded=true;
                };
                fileReader.readAsArrayBuffer(data);                    
            },
            error: function(xhr, status, error) { alert("error loading 1541 rom ["+error+"]"); }
        });        

        this.viaChip1=via1;
        this.viaChip2=via2;

        this.ciaChip1=cia1;
        this.ciaChip2=cia2;

        this.theFdc=fdc;

        this.IECLines = 0x38;
        this.atn_ack = 0x08;

        this.cycle_counter=0;
    }

    updateCycles(c)
    {
        this.cycle_counter=c;
    }

    CalcIECLines()
    {
        let iec = this.IECLines & this.ciaChip2.IECLines;
        iec &= ((iec ^ this.atn_ack) << 2) | 0xdf;	// ATN acknowledge pulls DATA low
        return iec&0xff;
    }

    set_iec_lines(inv_out)
    {
        this.IECLines = ((inv_out & 0x02) << 4)	// DATA on PB1
                 | ((inv_out & 0x08) << 1)	// CLK on PB3
                 | 0x08;					// No output on ATN
    
        this.atn_ack = (~inv_out & 0x10) >> 1;	// PB4
    }

    //

    readAddr(addr)
    {
        if (
            (addr !== addr) // is NaN?
            || (typeof addr !== "number")
            || (addr !== Math.floor(addr))
            || (addr < 0)
            || (addr > 0xffff)
          ) 
        {
            console.log("1541::readAddr::Bad address ["+addr+"]");
        }

        if (addr>=0xc000)
        {
            // ROM
            return this.diskROM[addr-0xc000];
        }
        else if (addr<=0x7ff)
        {
            // disk drive RAM
            return this.diskRAM[addr];
        }
        else if ((addr & 0x1c00) == 0x1800)
        {
            switch (addr & 0xf) 
            {
                case 0: {	// Port B
                    let iec = ~this.CalcIECLines();		        // 1541 reads inverted bus lines
                    let inbyte = ((iec & 0x20) >> 5)	    // DATA from bus on PB0
                               | ((iec & 0x10) >> 2)	// CLK from bus on PB2
                               | ((iec & 0x08) << 4)	// ATN from bus on PB7
                               | 0x1a;					// Output lines high
                    this.viaChip1.SetPBIn(inbyte&0xff);
                    break;
                }
                case 1:		// Port A
                case 15:	// Port A (no handshake)
                    this.viaChip1.SetPAIn(0xff);
                    break;
            }
    
            return this.viaChip1.readVIARegister(addr);            
        }
        else if ((addr & 0x1c00) == 0x1c00)
        {
            if ((addr & 0xf)==0)
            {
                let inbyte = this.theFdc.WPSensorClosed(this.cycle_counter) ? 0 : 0x10;
                if (!this.theFdc.syncFound(this.cycle_counter)) 
                {
                    inbyte |= 0x80;
                }

                this.viaChip2.SetPBIn(inbyte&0xff);
            }
            else if (((addr&0x0f)==1)||((addr&0x0f)==15))
            {
                let inbyte=this.theFdc.ReadGCRByte(this.cycle_counter);
                //console.log("redGCR ["+inbyte+"]");
                this.viaChip2.SetPAIn(inbyte&0xff);
            }
    
            return this.viaChip2.readVIARegister(addr);            
        }
        else
        {
            console.log("1541::Unmapped read from ["+addr.toString(16).padStart(4,'0')+"]");
            return (addr>>8); // open bus
        }
    
        return 0;
    }

    readAddr16bit(addr)
    {
        //console.log("Warning: 16bit CPU read");
        //if (addr<=0xff) return (this.readAddr(addr)+(this.readAddr((addr+1)&0xff)<<8));
        return (this.readAddr(addr)|((this.readAddr(addr+1)<<8)))&0xffff;
    }
    
    getWrappedAddr(addr)
    {
        if ((addr & 0xff) == 0xff)
        {
            return ((this.readAddr(addr&0xff00)) << 8) | (this.readAddr(addr));
        }
        else
        {
            return ((this.readAddr(addr + 1)) << 8) | (this.readAddr(addr));
        }
    }

    writeAddr(addr,value)
    {
        if (
            (addr !== addr) // is NaN?
            || (typeof addr !== "number")
            || (addr !== Math.floor(addr))
            || (addr < 0)
            || (addr > 0xffff)
          ) 
        {
            console.log("1541::writeAddr::Bad address ["+addr+"]");
        }

        if ((value<0)||(value>0xffff))
        {
            alert("Mega-error!");
        }

        if (addr<=0x7ff) 
        {
            // disk drive RAM
            this.diskRAM[addr]=value;
        }
        else if ((addr & 0x1c00) == 0x1800)
        {
            this.viaChip1.writeVIARegister(addr,value);       
            
            if (((addr&0xf)==0)||((addr&0x0f)==2))
            {
                this.set_iec_lines(~(this.viaChip1.PBOut()));
            }
        }
        else if ((addr & 0x1c00) == 0x1c00)
        {
            let old_pb_out = this.viaChip2.PBOut();

            this.viaChip2.writeVIARegister(addr,value);            
     
            switch (addr & 0xf) 
            {
                case 0:		// Port B
                case 2: {	// DDR B
                    let pb_out = this.viaChip2.PBOut();
                    let changed = old_pb_out ^ pb_out;
    
                    // Bits 0/1: Stepper motor
                    if (changed & 0x03) 
                    {
                        if ((old_pb_out & 3) == ((pb_out + 1) & 3)) 
                        {
                            this.theFdc.moveHeadOut();
                        } 
                        else if ((old_pb_out & 3) == ((pb_out - 1) & 3)) 
                        {
                            this.theFdc.moveHeadIn();
                        }
                    }
    
                    // Bit 2: Spindle motor
                    if (changed & 0x04) 
                    {
                        this.theFdc.setMotor(pb_out & 0x04);
                    }
    
                    // Bits 5/6: GCR bit rate
                    if (changed & 0x60) 
                    {
                        this.theFdc.setBitrate((pb_out >> 5) & 0x03);
                    }
                    break;
                }
            }
        }
        else if (addr>=0x8000)
        {
            console.log("1541::Error: attempt to write on ROM at addr ["+addr.toString(16).padStart(4,'0')+"]");
        }
        else
        {
            console.log("1541::Unmapped write to ["+addr.toString(16).padStart(4,'0')+"]");
        }
    }

    writeAddr16bit(addr,value)
    {
        console.log("%cWarning: unhandled write 16 bit to 1541 MMU","color:#E3823D");    
    }

    checkSO()
    {
        let set_overflow_enabled=((this.viaChip2.pcr & 0x0e) == 0x0e);
        
        if (set_overflow_enabled && this.theFdc.byteReady(this.cycle_counter)) 
        {
            return true;
        }
    
        return false;
    }
}
