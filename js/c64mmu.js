/* c64 mmu */

class c64mmu
{
    constructor(vicChip,ciaChip1,ciaChip2,sidChip)
    {
        this.basic_in=false;
        this.kernal_in=true;
        this.char_in=false;
        this.io_in=false;

        this.chargenROM=new Array();
        this.basicROM=new Array();
        this.kernalROM=new Array();

        this.ram64k=new Array(65536);
        this.cpustack=new Array(0x100);
        this.colorram=new Array(0x800);

        for (var i=0;i<0x800;i++) this.colorram[i]=0;

        var ramPos=0;
        for (var i = 0; i < 512; i++)
        {
            for (var j = 0; j < 64; j++) { this.ram64k[ramPos] = 0x00; ramPos++; }
            for (var j = 0; j < 64; j++) { this.ram64k[ramPos] = 0xff; ramPos++; }
        }

        for (var b=0;b<0x100;b++) this.cpustack[b]=0;

        this.lastVICbyte=0;

        this.vicChip=vicChip;
        this.ciaChip1=ciaChip1;
        this.ciaChip2=ciaChip2;
        this.sidChip=sidChip;

        this.dataDirReg=0x0;
        this.processorPortReg=0x0;
        this.setProcessorPortConfig();

        // load chargen, basic and kernal roms
        this.romsLoaded=false;

        var thisInstance=this;
        $.ajax({
            url: "roms/Char.rom",type: "GET",processData: false,dataType: "binary",
            success: function(data) 
            {
                var arrayBuffer;
                var fileReader = new FileReader();
                fileReader.onload = function(event) 
                {
                    arrayBuffer = event.target.result;
                    var uint8ArrayNew  = new Uint8Array(arrayBuffer);
                    for (var c=0;c<4096;c++)
                    {
                        thisInstance.chargenROM.push(uint8ArrayNew[c]);
                    }

                    $.ajax({
                        url: "roms/Basic.rom",type: "GET",processData: false,dataType: "binary",
                        success: function(data) 
                        {
                            var arrayBuffer;
                            var fileReader = new FileReader();
                            fileReader.onload = function(event) 
                            {
                                arrayBuffer = event.target.result;
                                var uint8ArrayNew  = new Uint8Array(arrayBuffer);
                                for (var c=0;c<8192;c++)
                                {
                                    thisInstance.basicROM.push(uint8ArrayNew[c]);
                                }

                                $.ajax({
                                    url: "roms/Kernal.rom",type: "GET",processData: false,dataType: "binary",
                                    success: function(data) 
                                    {
                                        var arrayBuffer;
                                        var fileReader = new FileReader();
                                        fileReader.onload = function(event) 
                                        {
                                            arrayBuffer = event.target.result;
                                            var uint8ArrayNew  = new Uint8Array(arrayBuffer);
                                            for (var c=0;c<8192;c++)
                                            {
                                                thisInstance.kernalROM.push(uint8ArrayNew[c]);
                                            }

                                            // kernal patch to speedup booting process
                                            thisInstance.kernalROM[0xFD84-0xE000] = 0xea;
                                            thisInstance.kernalROM[0xFD85-0xE000] = 0x88;

                                            thisInstance.romsLoaded=true;
                                        }
                                        fileReader.readAsArrayBuffer(data);                    
                                    },
                                    error: function(xhr, status, error) { alert("error loading kernal rom ["+error+"]"); }
                                });
    
                            };
                            fileReader.readAsArrayBuffer(data);                    
        
                        },
                        error: function(xhr, status, error) { alert("error loading BASIC rom ["+error+"]"); }
                    });        
    
                };
                fileReader.readAsArrayBuffer(data);                    

        
            },
            error: function(xhr, status, error) { alert("error loading chargen rom ["+error+"]"); }
        });        
    }

    setProcessorPortConfig()
    {
        var port = ((~this.dataDirReg) | (this.processorPortReg&0x7))&0xff;

        /*console.log("pport conf: ["+this.dataDirReg.toString(16)+"] ["+this.processorPortReg.toString(16)+"]")
        */
/*
        if ( ((port & 7) == 3) || ((port & 7) == 7)) this.basic_in=true;
        else this.basic_in=false;
        
        if ( ((port & 7) == 2) || ((port & 7) == 3) || ((port & 7) == 6) || ((port & 7) == 7)) this.kernal_in=true;
        else this.kernal_in=false;

        if ( ((port & 7) == 1) || ((port & 7) == 2) || ((port & 7) == 3)) this.char_in=true;
        else this.char_in=false;

        if ( ((port & 7) == 5) || ((port & 7) == 6) || ((port & 7) == 7)) this.io_in = true;
        else this.io_in = false;
*/
        if ((port & 3) == 3) this.basic_in=true;
        else this.basic_in=false;

        if ((port & 2) != 0) this.kernal_in=true;
        else this.kernal_in=false;

        if (((port & 3) != 0) && ((port & 4) == 0)) this.char_in=true;
        else this.char_in=false;

        if (((port & 3) != 0) && ((port & 4) != 0)) this.io_in = true;
        else this.io_in = false;        
    }    

    //

    readAddr(addr,fromVIC=false)
    {
        if (
            (addr !== addr) // is NaN?
            || (typeof addr !== "number")
            || (addr !== Math.floor(addr))
            || (addr < 0)
            || (addr > 0xffff)
          ) 
        {
            //alert("readAddr::Bad address ["+addr+"]");
        }

        addr&=0xffff;

        if (fromVIC)
        {
            if ((addr>=0x1000)&&(addr<0x2000))
            {
                return this.chargenROM[addr-0x1000];
            }
            else if ((addr>=0x9000)&&(addr<0xa000))
            {
                return this.chargenROM[addr-0x9000];
            }
            else
            {
                return this.ram64k[addr];
            }
        }

        if (addr==0x0000)
        {
            return this.dataDirReg;
        }
        else if (addr==0x0001)
        {
            //return this.processorPortReg&0xff;
            return ((this.dataDirReg & this.processorPortReg) | ((~this.dataDirReg) & 0x17))&0xff;
        }
        else if ((addr>=0x0002)&&(addr<=0xff))
        {
            return this.ram64k[addr];
        }
        else if ((addr>=0x100)&&(addr<=0x1ff))
        {
            return this.cpustack[addr-0x100];
        }
        else if ((addr>=0x200)&&(addr<=0x7fff))
        {
            return this.ram64k[addr];
        }
        else if ((addr >= 0x8000) && (addr <= 0x9fff))
        {
            // $8000-$9FFF, optional cartridge rom or RAM            
            return this.ram64k[addr];
        }
        else if ((addr >= 0xa000) && (addr <= 0xbfff))
        {
            if (!this.basic_in)
            {
                // fallthrough ram
                return this.ram64k[addr];
            }
            else
            {
                // basic rom
                return this.basicROM[addr - 0xa000];
            }
        }        
        else if ((addr >= 0xc000) && (addr <= 0xcfff))
        {
            // upper ram
            return this.ram64k[addr];
        }        
        else if ((addr >= 0xd000) && (addr <= 0xdfff))
        {
            if (this.io_in)
            {
                // I/O area
                if ((addr>=0xdc00)&&(addr<=0xdcff))
                {
                    // CIA1
                    return this.ciaChip1.readCIARegister(addr);
                }
                else if ((addr>=0xdd00)&&(addr<=0xddff))
                {
                    // CIA2
                    return this.ciaChip2.readCIARegister(addr);
                }
                else if ((addr >= 0xd400) && (addr <= 0xd7ff))
                {
                    return this.sidChip.readRegister(addr);
                }
                else if ((addr>=0xd800)&&(addr<=0xdbff))
                {
                    // color RAM
                    return ((this.colorram[addr-0xd800]&0x0f)|(this.lastVICbyte&0xf0));
                }                
                else if ((addr>=0xd000)&&(addr<=0xd3ff))
                {
                    this.lastVICbyte=this.vicChip.readVICRegister(addr);
                    return this.lastVICbyte;
                }
            }
            else 
            {
                if (this.char_in)
                {
                    // character rom
                    return this.chargenROM[addr - 0xd000];
                }
                else
                {
                    return this.ram64k[addr];
                }
            }
        }        
        else if ((addr>=0xe000)&&(addr<=0xffff))
        {
            if (!this.kernal_in)
            {
                // fallthrough ram
                return this.ram64k[addr];
            }
            else
            {
                return this.kernalROM[addr-0xe000];    
            }            
        }
        else
        {
            console.log("%cUnmapped read from ["+addr.toString(16)+"]","color:#E3823D");
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
            //alert("writeAddr::Bad address ["+addr+"]");
        }
        addr&=0xffff;

        if (addr==0x0000)
        {
            // Processor port data direction register
            this.dataDirReg=value;
            this.ram64k[0]=this.lastVICbyte;
            //console.log("Wrote ["+value.toString(16)+"] to dataDirReg 0000");
            this.setProcessorPortConfig();
        }
        else if (addr==0x0001)
        {
            // processor port
            this.processorPortReg=value;
            this.ram64k[1]=this.lastVICbyte;
            //console.log("Wrote ["+value.toString(16)+"] to processor port 0001");
            this.setProcessorPortConfig();
        }
        else if ((addr>=0x0002)&&(addr<=0xff))
        {
            this.ram64k[addr]=value;
        }
        else if ((addr>=0x100)&&(addr<=0x1ff))
        {
            this.cpustack[addr-0x100]=value;
        }
        else if ((addr>=0x200)&&(addr<=0x7fff))
        {
            this.ram64k[addr]=value;
        }
        else if ((addr >= 0x8000) && (addr <= 0x9fff))
        {
            // $8000-$9FFF, optional cartridge rom or RAM            
            this.ram64k[addr]=value;
        }
        else if ((addr >= 0xa000) && (addr <= 0xcfff))
        {
            // fallthrough ram
            this.ram64k[addr]=value;
        }        
        else if ((addr>=0xd000)&&(addr<=0xdfff))
        {
            if (!this.io_in)
            {
                this.ram64k[addr]=value;
            }
            else
            {
                if ((addr>=0xd800)&&(addr<=0xdbff))
                {
                    // color RAM
                    //this.ram64k[addr]=value;
                    this.colorram[addr-0xd800]=value&0x0f;
                }
                else if ((addr >= 0xdc00) && (addr <= 0xdcff))
                {
                    this.ciaChip1.writeCIARegister(addr, value);
                }
                else if ((addr>=0xdd00)&&(addr<=0xddff))
                {
                    this.ciaChip2.writeCIARegister(addr, value);
                }
                else if ((addr >= 0xd400) && (addr <= 0xd7ff))
                {
                    this.sidChip.writeRegister(addr, value);
                }
                else if ((addr>=0xd000)&&(addr<=0xd3ff))
                {
                    this.vicChip.writeVICRegister(addr, value);
                }
            }
        }
        else if ((addr >= 0xe000) && (addr <= 0xffff))
        {
            // fallthrough ram
            this.ram64k[addr]=value;
        }        
        else
        {
            console.log("%cUnmapped write to ["+addr.toString(16)+"]",'color: #E3823D');
        }
    }

    writeAddr16bit(addr,value)
    {
        console.log("%cWarning: unhandled write 16 bit to MMU","color:#E3823D");    
    }
}
