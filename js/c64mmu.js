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

        for (var b=0;b<65536;b++) this.ram64k[b]=0;
        for (var b=0;b<0x100;b++) this.cpustack[b]=0;

        this.vicChip=vicChip;
        this.ciaChip1=ciaChip1;
        this.ciaChip2=ciaChip2;
        this.sidChip=sidChip;

        this.dataDirReg=0x2f;
        this.processorPortReg=0x37;
        this.setProcessorPortConfig();

        // load chargen, basic and kernal roms
        this.romsLoaded=false;

        var thisInstance=this;
        $.ajax({
            url: "roms/characters.901225-01.bin",type: "GET",processData: false,dataType: "binary",
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
                        url: "roms/basic.901226-01.bin",type: "GET",processData: false,dataType: "binary",
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
                                    url: "roms/kernal.901227-03.bin",type: "GET",processData: false,dataType: "binary",
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
        var port = (~this.dataDirReg | this.processorPortReg)&0xff;

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

    readAddr(addr)
    {
        if ((addr >= 0xa000) && (addr <= 0xbfff))
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
        else if (addr==0x0000)
        {
            return this.dataDirReg;
        }
        else if (addr==0x0001)
        {
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
        else if ((addr >= 0xd000) && (addr <= 0xdfff))
        {
            if (!this.io_in)
            {
                if (!this.char_in)
                {
                    return this.ram64k[addr];
                }
                else
                {
                    // character rom
                    return this.chargenROM[addr - 0xd000];
                }
            }
            else
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
                    return this.ram64k[addr];
                }                
                else
                {
                    return this.vicChip.readVICRegister(addr);
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
        return (this.readAddr(addr)|(this.readAddr(addr+1)<<8))&0xffff;
    }

    writeAddr(addr,value)
    {
        if (addr==0x0000)
        {
            // Processor port data direction register
            this.dataDirReg=value;
            //console.log("Wrote ["+value.toString(16)+"] to dataDirReg 0000");
            this.setProcessorPortConfig();
        }
        else if (addr==0x0001)
        {
            // processor port
            this.processorPortReg=value;
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
                    this.ram64k[addr]=value;
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
                    //theSid.writeRegister(address, value);
                }
                else
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
