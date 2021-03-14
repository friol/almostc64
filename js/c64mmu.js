/* c64 mmu */

class c64mmu
{
    constructor(vicChip,ciaChip1,ciaChip2)
    {
        this.chargenROM=new Array();
        this.basicROM=new Array();
        this.kernalROM=new Array();

        this.ram64k=new Array();
        this.cpustack=new Array(0x100);

        this.vicChip=vicChip;
        this.ciaChip1=ciaChip1;
        this.ciaChip2=ciaChip2;

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

    //

    readAddr(addr)
    {
        var rl=this.romsLoaded;

        if ((addr>=0x100)&&(addr<=0x1ff))
        {
            return this.cpustack[addr-0x100];
        }
        else if ((addr>=0xe000)&&(addr<=0xffff))
        {
            return this.kernalROM[addr-0xe000];    
        }
        else
        {
            console.log("Unmapped read from ["+addr.toString(16)+"] at address ["+addr.toString(16)+"]");
        }

        return 0;
    }

    readAddr16bit(addr)
    {
        if (addr<=0xff) return (this.readAddr(addr)+(this.readAddr((addr+1)&0xff)<<8));
        return (this.readAddr(addr)+(this.readAddr(addr+1)<<8));
    }

    writeAddr(addr,value)
    {
        if ((addr>=0x100)&&(addr<=0x1ff))
        {
            this.cpustack[addr-0x100]=value;
        }
        else if (addr==0xd016)
        {
            this.vicChip.setControlReg2(value);
        }
        else if (addr==0xdc00)
        {
            this.ciaChip1.setDataPortA(value);
        }
        else if (addr==0xdc0d)
        {
            this.ciaChip1.setIrqControlReg(value);
        }
        else if (addr==0xdd0d)
        {
            this.ciaChip2.setIrqControlReg(value);
        }
        else
        {
            console.log("Unmapped write to ["+addr.toString(16)+"]");
        }
    }

    writeAddr16bit(addr,value)
    {
        console.log("Warning: unhandled write 16 bit to MMU");    
    }


}
