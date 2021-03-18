/* c64 mythical VIC-II chip */

class vic
{
    constructor()
    {
        this.controlreg2_d016=0;
        this.memoryControlReg_d018=0;
        this.screencontrol1_d011=0x1b;
        this.irqEnable_d01a=0;
        this.irqFlagRegister_d019=0;
        this.rasterRegister_d012=0;

        this.backgroundColor=new Array();

        for (var bc=0;bc<4;bc++) this.backgroundColor[bc]=0;

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

        //
        // sprites&lightpen
        //

        this.spriteColors_d027_d02e=new Array(8);
        this.spriteMulticolor0_d025=0;
        this.spriteMulticolor1_d026=0;
        this.spriteToBackgroundCollision_d01f=0;
        this.spriteToSpriteCollision_d01e=0;
        this.spriteExpandHorizontal_d01d=0;
        this.spriteExpandVertical_d017=0;
        this.spriteMulticolorMode_d01c=0;
        this.spriteBackgroundPriority_d01b=0;
        this.spriteEnable_d015=0;
        this.spritePositionXupperbit_d010=0;

        this.spritePositionsX=new Array(8);
        this.spritePositionsY=new Array(8);

        for (var i=0;i<8;i++)
        {
            this.spritePositionsX[i]=0;
            this.spritePositionsY[i]=0;
        }

        this.lightPenLatchX_d013=0;
        this.lightPenLatchY_d014=0;


    }

    setControlReg2(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to Control Reg2");
        this.controlreg2_d016=value;
    }

    setBackgroundColor(value)
    {
        //console.log("VIC::write ["+value.toString(16)+"] to background color");
        this.backgroundColor[0]=value;
    }

    setBorderColor(value)
    {
        //console.log("VIC::write ["+value.toString(16)+"] to border color");
        this.foregroundColor=value;
    }

    setMemoryControlReg(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to memory control reg D018");
        this.memoryControlReg_d018=value;
    }

    writeVICRegister(addr,value)
    {
        if ((addr>=0xd000)&&(addr<=0xd00f))
        {
            if ((addr%2)==0) this.spritePositionsX[(addr&0x0f)/2]=value;
            else this.spritePositionsY[((addr&0x0f)-1)/2]=value;
        }
        else if (addr==0xd010)
        {
            this.spritePositionXupperbit_d010=value;
        }
        else if (addr==0xd011)
        {
            this.screencontrol1_d011=value;
        }
        else if (addr==0xd012)
        {
            this.rasterRegister_d012=value;
        }
        else if (addr==0xd013)
        {
            this.lightPenLatchX_d013=value;
        }
        else if (addr==0xd014)
        {
            this.lightPenLatchY_d014=value;
        }
        else if (addr==0xd015)
        {
            this.spriteEnable_d015=value;            
        }
        else if (addr==0xd016)
        {
            this.setControlReg2(value);
        }
        else if (addr==0xd017)
        {
            this.spriteExpandVertical_d017=value;            
        }
        else if (addr==0xd018)
        {
            this.setMemoryControlReg(value);
        }
        else if (addr == 0xD019)
        {
            //Bit #0: 0 = Acknowledge raster interrupt.
            //Bit #1: 0 = Acknowledge sprite-background collision interrupt.
            //Bit #2: 0 = Acknowledge sprite-sprite collision interrupt.
            //Bit #3: 0 = Acknowledge light pen interrupt.

            this.irqFlagRegister_d019 = (this.irqFlagRegister_d019 & (~value & 0x0f));
            if ((this.irqFlagRegister_d019 & this.irqEnable_d01a) != 0)
            {
                this.irqFlagRegister_d019 |= 0x80;
            }
            else
            {
                // irq acknowledged
                //cpu6510 theCpu = cpu6510.getInstance();
                //theCpu.vicirqPending = false;
            }
        }        
        else if (addr==0xd01a)
        {
            this.irqEnable_d01a=value&0x0f;
            /*if ((intstatusreg & irqControl_d01a) != 0)
            {
                intstatusreg |= 0x80;
                theCpu.vicirqPending = true;
            }
            else
            {
                intstatusreg &= 0x7f;
                theCpu.vicirqPending=false;
            }*/            
        }
        else if (addr==0xd01b)
        {
            this.spriteBackgroundPriority_d01b=value;
        }
        else if (addr==0xd01c)
        {
            this.spriteMulticolorMode_d01c=value;
        }
        else if (addr==0xd01d)
        {
            this.spriteExpandHorizontal_d01d=value;
        }
        else if (addr==0xd01e)
        {
            this.spriteToSpriteCollision_d01e=value;
        }
        else if (addr==0xd01f)
        {
            this.spriteToBackgroundCollision_d01f=value;
        }
        else if (addr==0xd020)
        {
            this.setBorderColor(value);
        }
        else if (addr==0xd021)
        {
            this.setBackgroundColor(value);
        }
        else if (addr==0xd022)
        {
            this.backgroundColor[1]=value;
        }
        else if (addr==0xd023)
        {
            this.backgroundColor[2]=value;
        }
        else if (addr==0xd024)
        {
            this.backgroundColor[3]=value;
        }
        else if (addr==0xd025)
        {
            this.spriteMulticolor0_d025=value;
        }
        else if (addr==0xd026)
        {
            this.spriteMulticolor1_d026=value;
        }
        else if ((addr>=0xd027)&&(addr<=0xd02e))
        {
            this.spriteColors_d027_d02e[addr-0xd027]=value;
        }
        else
        {
            console.log("VIC::write ["+value.toString(16)+"] to unhandled reg "+addr.toString(16));
        }
    }

    readVICRegister(addr)
    {
        if (addr==0xd011)
        {
            var ret = (this.screencontrol1_d011 & 0x7f);
            //if (currentRasterLine >= 256) ret |= 0x80;
            return ret;
        }
        else if (addr==0xd018)
        {
            return this.memoryControlReg_d018|0x01;
        }

        return 0;
    }

    // C64 has a normal text mode (monochrome chars on monochrome bg)
    // extended color mode (monochrome chars on 4 bg colors)
    // multicolor mode (4 color chars on bg)

    drawChar(chpx,chpy,currentChar,currentCharCol,ctx,charrom,cia2,mmu,mempos)
    {
        var rfg=this.c64palette[(currentCharCol*3)+0];
        var gfg=this.c64palette[(currentCharCol*3)+1];
        var bfg=this.c64palette[(currentCharCol*3)+2];

        var extendedColorTextMode=false;
        if (this.screencontrol1_d011&0x40)
        {
            extendedColorTextMode=true;            
        }

        var bgColorNumber=0;
        if (extendedColorTextMode) 
        {
            bgColorNumber=(currentChar>>6)&0x03;
            currentChar&=0x3f;
        }

        var multicolorMode=false;
        if (this.controlreg2_d016&0x10)
        {
            multicolorMode=true;
        }

        var rbg=this.c64palette[(this.backgroundColor[bgColorNumber]*3)+0];
        var gbg=this.c64palette[(this.backgroundColor[bgColorNumber]*3)+1];
        var bbg=this.c64palette[(this.backgroundColor[bgColorNumber]*3)+2];

        var rgbArr=new Array(3*4);
        for (var col=0;col<4;col++)
        {
            rgbArr[(col*3)+0]=this.c64palette[(this.backgroundColor[col]*3)+0];
            rgbArr[(col*3)+1]=this.c64palette[(this.backgroundColor[col]*3)+1];
            rgbArr[(col*3)+2]=this.c64palette[(this.backgroundColor[col]*3)+2];
        }

        for (var y=0;y<8;y++)
        {
            var curbyte;

            if ((mempos == 0x1000) || (mempos == 0x9000))
            {
                curbyte = charrom[(currentChar * 8) + y];
            }
            else if ((mempos == 0x1800) || (mempos == 0x9800))
            {
                curbyte = charrom[0x800+(currentChar * 8) + y];
            }
            else
            {
                curbyte = mmu.readAddr(mempos + ((currentChar * 8) + y));
            }

            if (multicolorMode && ((currentCharCol&0x08)!=0))
            {
                // draw as multicolor char
                for (var x=0;x<8;x+=2)
                {
                    var cur2bits = (curbyte >> (6 - x)) & 0x03;
                    if (cur2bits<0x03)
                    {
                        this.frameBuffer[(0+((chpx+x+0)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=rgbArr[(cur2bits*3)+0];
                        this.frameBuffer[(1+((chpx+x+0)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=rgbArr[(cur2bits*3)+1];
                        this.frameBuffer[(2+((chpx+x+0)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=rgbArr[(cur2bits*3)+2];
                        this.frameBuffer[(3+((chpx+x+0)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=255;

                        this.frameBuffer[(0+((chpx+x+1)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=rgbArr[(cur2bits*3)+0];
                        this.frameBuffer[(1+((chpx+x+1)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=rgbArr[(cur2bits*3)+1];
                        this.frameBuffer[(2+((chpx+x+1)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=rgbArr[(cur2bits*3)+2];
                        this.frameBuffer[(3+((chpx+x+1)*4))+(((chpy+y)*this.xResolutionTotal)*4)]=255;
                    }
                    else
                    {
                        this.frameBuffer[0+((chpx+x+0)*4)+((chpy+y)*this.xResolutionTotal)*4]=this.c64palette[((currentCharCol&7)*3)+0];
                        this.frameBuffer[1+((chpx+x+0)*4)+((chpy+y)*this.xResolutionTotal)*4]=this.c64palette[((currentCharCol&7)*3)+1];
                        this.frameBuffer[2+((chpx+x+0)*4)+((chpy+y)*this.xResolutionTotal)*4]=this.c64palette[((currentCharCol&7)*3)+2];
                        this.frameBuffer[3+((chpx+x+0)*4)+((chpy+y)*this.xResolutionTotal)*4]=255;

                        this.frameBuffer[0+((chpx+x+1)*4)+((chpy+y)*this.xResolutionTotal)*4]=this.c64palette[((currentCharCol&7)*3)+0];
                        this.frameBuffer[1+((chpx+x+1)*4)+((chpy+y)*this.xResolutionTotal)*4]=this.c64palette[((currentCharCol&7)*3)+1];
                        this.frameBuffer[2+((chpx+x+1)*4)+((chpy+y)*this.xResolutionTotal)*4]=this.c64palette[((currentCharCol&7)*3)+2];
                        this.frameBuffer[3+((chpx+x+1)*4)+((chpy+y)*this.xResolutionTotal)*4]=255;
                    }
                }
            }
            else
            {
                for (var x=0;x<8;x++)
                {
                    var curbit=(curbyte>>(7-x))&0x01;
                    if (curbit)
                    {
                        this.frameBuffer[0+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=rfg;
                        this.frameBuffer[1+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=gfg;
                        this.frameBuffer[2+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=bfg;
                        this.frameBuffer[3+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=255;
                    }
                    else
                    {
                        this.frameBuffer[0+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=rbg;
                        this.frameBuffer[1+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=gbg;
                        this.frameBuffer[2+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=bbg;
                        this.frameBuffer[3+((chpx+x)*4)+((chpy+y)*this.xResolutionTotal)*4]=255;
                    }
                }
            }
        }
    }

    drawBitmapScreen(ctx,mmu,cia2)
    {
        var basecoladdr = 0x0400;

        var vicbank = cia2.cia2getVICbank();
        vicbank = (3 - vicbank) * 0x4000;
        var baseaddr = ((this.memoryControlReg_d018 >> 3) & 0x01) * 0x2000;
        baseaddr |= vicbank;

        var colorRamPos=0;
        for (var y=this.yUpperBorderWidth;y<(this.yUpperBorderWidth+200);y+=8)
        {
            var x=this.xLeftBorderWidth;
            for (var b=0;b<40;b++)
            {
                if ((this.controlreg2_d016 & 0x10) == 0)
                {
                    // monochrome bitmap graphics
        
                    for (var bcell=0;bcell<8;bcell++)
                    {
                        var bytecol=mmu.readAddr(basecoladdr);
                        var bytepix=mmu.readAddr(baseaddr);

                        var rbg=this.c64palette[((bytecol&0x0f)*3)+0];
                        var gbg=this.c64palette[((bytecol&0x0f)*3)+1];
                        var bbg=this.c64palette[((bytecol&0x0f)*3)+2];
                        var rfg=this.c64palette[((bytecol>>4)*3)+0];
                        var gfg=this.c64palette[((bytecol>>4)*3)+1];
                        var bfg=this.c64palette[((bytecol>>4)*3)+2];
                        
                        for (var px=0;px<8;px++)
                        {
                            var curbit=(bytepix>>(7-px))&0x01;
                            if (curbit)
                            {
                                this.frameBuffer[0+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=rfg;
                                this.frameBuffer[1+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=gfg;
                                this.frameBuffer[2+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=bfg;
                                this.frameBuffer[3+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=255;
                            }
                            else
                            {
                                this.frameBuffer[0+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=rbg;
                                this.frameBuffer[1+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=gbg;
                                this.frameBuffer[2+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=bbg;
                                this.frameBuffer[3+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=255;
                            }
                        }
    
                        baseaddr++;
                    }

                    basecoladdr++;
                    x+=8;
                }
                else
                {
                    // multicolor bitmap graphics

                    for (var bcell=0;bcell<8;bcell++)
                    {
                        var bytecol=mmu.readAddr(basecoladdr);
                        var bytepix=mmu.readAddr(baseaddr);

                        var colorArray=new Array(4*3);
                        colorArray[0]=this.c64palette[(this.backgroundColor[0]*3)+0];
                        colorArray[1]=this.c64palette[(this.backgroundColor[0]*3)+1];
                        colorArray[2]=this.c64palette[(this.backgroundColor[0]*3)+2];

                        colorArray[3]=this.c64palette[(((bytecol>>4)&0x0f)*3)+0];
                        colorArray[4]=this.c64palette[(((bytecol>>4)&0x0f)*3)+1];
                        colorArray[5]=this.c64palette[(((bytecol>>4)&0x0f)*3)+2];
                        
                        colorArray[6]=this.c64palette[((bytecol&0x0f)*3)+0];
                        colorArray[7]=this.c64palette[((bytecol&0x0f)*3)+1];
                        colorArray[8]=this.c64palette[((bytecol&0x0f)*3)+2];

                        const colorRamAddr=0xd800;
                        var colRamVal=mmu.readAddr(colorRamAddr+colorRamPos)&0x0f;
                        colorArray[9]= this.c64palette[(colRamVal*3)+0];
                        colorArray[10]=this.c64palette[(colRamVal*3)+1];
                        colorArray[11]=this.c64palette[(colRamVal*3)+2];

                        for (var px=0;px<8;px+=2)
                        {
                            var cur2bits=(bytepix>>(7-px))&0x03;

                            this.frameBuffer[0+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=colorArray[0+(cur2bits*3)];
                            this.frameBuffer[1+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=colorArray[1+(cur2bits*3)];
                            this.frameBuffer[2+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=colorArray[2+(cur2bits*3)];
                            this.frameBuffer[3+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=255;

                            this.frameBuffer[4+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=colorArray[0+(cur2bits*3)];
                            this.frameBuffer[5+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=colorArray[1+(cur2bits*3)];
                            this.frameBuffer[6+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=colorArray[2+(cur2bits*3)];
                            this.frameBuffer[7+((x+px)*4)+((y+bcell)*this.xResolutionTotal)*4]=255;
                        }
    
                        baseaddr++;
                    }

                    basecoladdr++;
                    x+=8;
                }

                colorRamPos+=1;
            }
        }

    }

    simpleRenderer(canvasName,px,py,mmu,cia2)
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

        if ((this.screencontrol1_d011&0x20)==0)
        {
            // draw inner area
            var colorRamAddr=0xd800;
            var chpx=px+this.xLeftBorderWidth;
            var chpy=py+this.yUpperBorderWidth;

            for (var y=0;y<this.charmodeNumychars;y++)
            {
                for (var x=0;x<this.charmodeNumxchars;x++)
                {
                    var vicbank = cia2.cia2getVICbank();
                    vicbank = (3 - vicbank) * 0x4000;
                    var videopage = (((this.memoryControlReg_d018 >> 4) & 0x0f) * 0x400);

                    var mempos = ((this.memoryControlReg_d018 >> 1) & 7) * 0x800;
                    mempos |= vicbank;
                    
                    var currentChar=mmu.readAddr(videopage+(x+(y*this.charmodeNumxchars)));
                    var currentCharCol=mmu.readAddr(colorRamAddr)&0x0f;
                    this.drawChar(chpx,chpy,currentChar,currentCharCol,ctx,mmu.chargenROM,cia2,mmu,mempos);

                    chpx+=8;
                    colorRamAddr++;
                }

                chpy+=8;
                chpx=px+this.xLeftBorderWidth;
            }
        }
        else
        {
            // bitmap mood
            this.drawBitmapScreen(ctx,mmu,cia2);
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
