/* disk/1541 mmu */

class disk1541mmu
{
    constructor(via1,via2)
    {
        // 16kb of disk ROM
        this.diskROM=new Array();

        // 2kb of RAM
        this.diskRAM=new Array(0x800);

        var ramPos=0;
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
                    for (var c=0;c<16384;c++)
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

        addr&=0xffff;

        if (addr<0x800)
        {
            // disk drive RAM
            return this.diskRAM[addr];
        }
        else if (addr>=0xc000)
        {
            // ROM
            return this.diskROM[addr-0xc000];
        }
        else if ((addr>=0x1800)&&(addr<=0x1bff))
        {
            return this.viaChip1.readVIARegister(addr);            
        }
        else if ((addr>=0x1c00)&&(addr<=0x1fff))
        {
            return this.viaChip2.readVIARegister(addr);            
        }
        else
        {
            console.log("1541::Unmapped read from ["+addr.toString(16).padStart(4,'0')+"]");
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
        addr&=0xffff;

        if (addr<=0xfff)
        {
            // disk drive RAM
            this.diskRAM[addr&0x07FF]=value;
        }
        else if ((addr>=0x1800)&&(addr<=0x1bff))
        {
            this.viaChip1.writeVIARegister(addr,value);            
        }
        else if ((addr>=0x1c00)&&(addr<=0x1fff))
        {
            this.viaChip2.writeVIARegister(addr,value);            
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
}
