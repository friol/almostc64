/* c64 mythical VIC-II chip */

class vic
{
    constructor()
    {
        this.controlreg=0;
        this.controlreg2=0;
        this.memoryControlReg=0;

        this.backgroundColor=6;
        this.foregroundColor=14;

        this.xResolutionTotal=402;
        this.yResolutionTotal=292;
        this.xLeftBorderWidth=46;
        this.yUpperBorderWidth=43;

        this.charmodeNumxchars=40;
        this.charmodeNumychars=25;

        this.c64palette=[0, 0, 0,
        255, 255, 255,
        136, 0, 0,
        170, 255, 238,
        204, 68, 204,
        0, 204, 85,
        0, 0, 170,
        238, 238, 119,
        221, 136, 85,
        102, 68, 0,
        255, 119, 119,
        51, 51, 51,
        119, 119, 119,
        170, 255, 102,
        0, 136, 255,
        187, 187, 187];

        this.frameBuffer=new Uint8ClampedArray(this.xResolutionTotal*this.yResolutionTotal*4); // RGBA framebuffer
        for (var i=0;i<(this.xResolutionTotal*this.yResolutionTotal*4);i++)
        {
            this.frameBuffer[i]=255;
        }        
    }

    setControlReg2(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to Control Reg2");
        this.controlreg2=value;
    }

    setBackgroundColor(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to background color");
        this.backgroundColor=value;
    }

    setForegroundColor(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to foreground color");
        this.foregroundColor=value;
    }

    setMemoryControlReg(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to memory control reg D018");
        this.memoryControlReg=value;
    }

    writeVICRegister(addr,value)
    {
        if (addr==0xd016)
        {
            this.setControlReg2(value);
        }
        else if (addr==0xd018)
        {
            this.setMemoryControlReg(value);
        }
        else if (addr==0xd020)
        {
            this.setForegroundColor(value);
        }
        else if (addr==0xd021)
        {
            this.setBackgroundColor(value);
        }
    }

    drawChar(chpx,chpy,currentChar,ctx,charrom)
    {
        var rfg=this.c64palette[(this.foregroundColor*3)+0];
        var gfg=this.c64palette[(this.foregroundColor*3)+1];
        var bfg=this.c64palette[(this.foregroundColor*3)+2];
        var fgColor="rgb("+rfg+","+gfg+","+bfg+")";        
        var rbg=this.c64palette[(this.backgroundColor*3)+0];
        var gbg=this.c64palette[(this.backgroundColor*3)+1];
        var bbg=this.c64palette[(this.backgroundColor*3)+2];
        var bgColor="rgb("+rbg+","+gbg+","+bbg+")";        

        for (var y=0;y<8;y++)
        {
            var curbyte=charrom[(currentChar*8)+y];
            for (var x=0;x<8;x++)
            {
                var curbit=(curbyte>>(7-x))&0x01;
                if (curbit)
                {
                    //ctx.fillStyle = fgColor;
                    //ctx.fillRect(chpx+x,chpy+y,1,1);
                    this.frameBuffer[0+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=rfg;
                    this.frameBuffer[1+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=gfg;
                    this.frameBuffer[2+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=bfg;
                    this.frameBuffer[3+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=255;
                }
                else
                {
                    //ctx.fillStyle = bgColor;
                    //ctx.fillRect(chpx+x,chpy+y,1,1);
                    this.frameBuffer[0+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=rbg;
                    this.frameBuffer[1+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=gbg;
                    this.frameBuffer[2+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=bbg;
                    this.frameBuffer[3+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=255;
                }
            }
        }
    }

    simpleRenderer(canvasName,px,py,mmu)
    {
        var canvas = document.getElementById(canvasName);
        var ctx = canvas.getContext("2d");

        var palnum=this.foregroundColor;
        var p1=this.c64palette[(palnum*3)+0];
        var p2=this.c64palette[(palnum*3)+1];
        var p3=this.c64palette[(palnum*3)+2];

        var borderColor="rgb("+p1+","+p2+","+p3+")";        

        // draw entire area, border color
        ctx.fillStyle=borderColor;
        ctx.fillRect(px,py,this.xResolutionTotal,this.yResolutionTotal);

        for (var i=0;i<(this.xResolutionTotal*this.yResolutionTotal*4);i+=4)
        {
            this.frameBuffer[i+0]=p1;
            this.frameBuffer[i+1]=p2;
            this.frameBuffer[i+2]=p3;
            this.frameBuffer[i+3]=255;
        }        

        // draw inner area
        var videoRamAddr=0x400;
        var chpx=px+this.xLeftBorderWidth;
        var chpy=py+this.yUpperBorderWidth;

        for (var y=0;y<this.charmodeNumychars;y++)
        {
            for (var x=0;x<this.charmodeNumxchars;x++)
            {
                var currentChar=mmu.readAddr(videoRamAddr);
                this.drawChar(chpx,chpy,currentChar,ctx,mmu.chargenROM);

                chpx+=8;
                videoRamAddr++;
            }

            chpy+=8;
            chpx=px+this.xLeftBorderWidth;
        }

        // spit it all out
        var canvas = document.getElementById("mainCanvass");
        var ctx = canvas.getContext("2d");
        var imgData = ctx.getImageData(0, 0, this.xResolutionTotal, this.yResolutionTotal);
        imgData.data.set(this.frameBuffer);

        var renderer = document.createElement('canvas');
        renderer.width = imgData.width;
        renderer.height = imgData.height;
        renderer.getContext('2d').putImageData(imgData, 0, 0);
        ctx.drawImage(renderer, px,py, this.xResolutionTotal, this.yResolutionTotal);
    }
}
