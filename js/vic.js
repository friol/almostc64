/* c64 mythical VIC-II chip */

class vic
{
    constructor()
    {
        this.imgData=undefined;
        this.canvasRenderer=undefined;

        this.rasterTicker=0;
        this.currentRasterLine=0;

        this.controlreg2_d016=0;
        this.memoryControlReg_d018=0;
        this.screencontrol1_d011=0x1b;
        this.irqEnable_d01a=0;
        this.irqFlagRegister_d019=0;
        this.rasterRegister_d012=0;

        this.intstatusreg=0x71;

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

    updateVic(clocksElapsed,theCpu)
    {
        this.rasterTicker += clocksElapsed;

        const rasterLines = 263;
        const framesPerSecond = 60;
        const c64freq = 1022727;

        var c64frame = c64freq / framesPerSecond;
        var clocksPerRasterline = 65;// c64frame / rasterLines;

        if (this.rasterTicker >= clocksPerRasterline)
        {
            this.rasterTicker -= clocksPerRasterline;
            this.currentRasterLine++;
            if (this.currentRasterLine >= rasterLines)
            {
                this.currentRasterLine = 0;
            }

            var cmpval = this.rasterRegister_d012;
            if ((this.screencontrol1_d011&0x80)!=0) cmpval+=256;

            if (this.currentRasterLine == cmpval)
            {
                this.intstatusreg |= 0x01;
                if ((this.irqEnable_d01a & 0x01) !=0)
                {
                    // trigger irq
                    theCpu.vicIrqPending=true;
                    this.intstatusreg |= 0x80;
                    //theLogger.logWrite("VIC irq fires");
                }
            }
        }
    }    

    setControlReg2(value)
    {
        //console.log("VIC::write ["+value.toString(16)+"] to Control Reg2");
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
        //console.log("VIC::write ["+value.toString(16)+"] to memory control reg D018");
        this.memoryControlReg_d018=value;
    }

    writeVICRegister(addr,value)
    {
        if ((addr >= 0xd040) && (addr <= 0xd3ff))
        {
            addr = (addr % 0x40) | 0xd000;
        }

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
        else if (addr==0xd030)
        {
            // unused reg on C64
        }
        else
        {
            console.log("VIC::write ["+value.toString(16)+"] to unhandled reg "+addr.toString(16));
        }
    }

    readVICRegister(addr)
    {
        if ((addr >= 0xd040) && (addr <= 0xd3ff))
        {
            addr = (addr % 0x40) | 0xd000;
        }

        if ((addr >= 0xD000) && (addr <= 0xD00F))
        {
            // sprite 0-7 x and y position, lower bits
            if ((addr%2)==0) return this.spritePositionsX[(addr&0x0f)/2];
            else return this.spritePositionsY[((addr&0x0f)-1)/2];
        }
        else if (addr==0xd010)
        {
            return this.spritePositionXupperbit_d010;
        }
        else if (addr==0xd011)
        {
            var ret = (this.screencontrol1_d011 & 0x7f);
            if (this.currentRasterLine >= 256) ret |= 0x80;
            return ret;
        }
        else if (addr == 0xD012)
        {
            return (this.currentRasterLine & 0xff);
        }
        else if (addr==0xd015)
        {
            return this.spriteEnable_d015;
        }
        else if (addr==0xd016)
        {
            return (this.controlreg2_d016|0xc0);
        }
        else if (addr==0xd017)
        {
            return this.spriteExpandVertical_d017;            
        }
        else if (addr==0xd018)
        {
            return this.memoryControlReg_d018|0x01;
        }
        else if (addr == 0xD019)
        {
            // interrupt status register
            return (this.intstatusreg| 0x70)&0xff;
        }
        else if (addr == 0xD01A)
        {
            return (this.irqEnable_d01a | 0xf0)&0xff;
        }
        else if (addr==0xd01b)
        {
            return this.spriteBackgroundPriority_d01b;
        }
        else if (addr==0xd01c)
        {
            return this.spriteMulticolorMode_d01c;
        }
        else if (addr==0xd01d)
        {
            return this.spriteExpandHorizontal_d01d;
        }
        else if (addr == 0xd01e)
        {
            return 0x00; // FIXX sprite collision register
        }
        else if (addr == 0xd01f)
        {
            return 0x00; // FIXXX sprite to background collision
        }        
        else if (addr==0xd020)
        {
            return this.foregroundColor;
        }
        else if (addr==0xd021)
        {
            return this.backgroundColor[0];
        }
        else if (addr==0xd022)
        {
            return this.backgroundColor[1];
        }
        else if (addr==0xd023)
        {
            return this.backgroundColor[2];
        }
        else if (addr==0xd024)
        {
            return this.backgroundColor[3];
        }     
        else if (addr==0xd025)
        {
            return this.spriteMulticolor0_d025;
        }
        else if ((addr>=0xd027)&&(addr<=0xd02e))
        {
            return this.spriteColors_d027_d02e[addr-0xd027];
        }
        else if (addr==0xd030)
        {
            // unused (on c64)
            return 0xff;
        }   
        else
        {
            console.log("VIC::read - unhandled reg "+addr.toString(16));
        }

        return 0;
    }

    // C64 has a normal text mode (monochrome chars on monochrome bg)
    // extended color mode (monochrome chars on 4 bg colors)
    // multicolor mode (4 color chars on bg)

    drawChar(chpx,chpy,currentChar,currentCharCol,ctx,charrom,cia2,mmu,mempos,row,column)
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

        //if (multicolorMode==true)
        {
            var vicbank = cia2.cia2getVICbank();
            var realvicbank = (3 - vicbank) * 0x4000;

            var memsetup2 = (((this.memoryControlReg_d018 >> 4) & 0x0f) * 0x400);
            var vicbase = memsetup2 | realvicbank;

            mempos = (((this.memoryControlReg_d018 >> 1) & 0x07) * 0x800) | realvicbank;
            currentChar = mmu.readAddr((row * 40) + column + vicbase);
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
        /*var vicbank = cia2.cia2getVICbank();
        vicbank = (3 - vicbank) * 0x4000;
        var baseaddr = ((this.memoryControlReg_d018 >> 3) & 0x01) * 0x2000;
        baseaddr |= vicbank;*/

        var vicBaseAddr = (~cia2.dataPortA & 0x03) << 14;
        var vicscreenMemoryAddr = (this.memoryControlReg_d018 & 0xf0) << 6;
        var basecoladdr=vicBaseAddr+vicscreenMemoryAddr;

        var bitmapMemoryAddr = (this.memoryControlReg_d018 & 0x08) << 10;
        var baseaddr=vicBaseAddr+bitmapMemoryAddr;

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

                    var colorArray=new Array(4*3);
                    colorArray[0]=this.c64palette[(this.backgroundColor[0]*3)+0];
                    colorArray[1]=this.c64palette[(this.backgroundColor[0]*3)+1];
                    colorArray[2]=this.c64palette[(this.backgroundColor[0]*3)+2];

                    var bytecol=mmu.readAddr(basecoladdr);

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

                    for (var bcell=0;bcell<8;bcell++)
                    {
                        var bytepix=mmu.readAddr(baseaddr);

                        for (var px=0;px<8;px+=2)
                        {
                            var cur2bits=(bytepix>>(6-px))&0x03;

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

    drawSprites(chpx,chpy,mmu,cia2)
    {
        chpx-=25;
        chpy-=50;

        for (var spritenum = 7; spritenum >=0; spritenum--)
        {
            if ((this.spriteEnable_d015 & (1 << spritenum)) != 0)
            {
                var sprcolornum = this.spriteColors_d027_d02e[spritenum] & 0x0f;
                var colArray=new Array(4*3);
                colArray[6]=this.c64palette[(sprcolornum*3)+0];
                colArray[7]=this.c64palette[(sprcolornum*3)+1];
                colArray[8]=this.c64palette[(sprcolornum*3)+2];
        
                var posx = this.spritePositionsX[spritenum];
                if ((this.spritePositionXupperbit_d010 & (1 << spritenum)) > 0) posx |= 256;
                var posy = this.spritePositionsY[spritenum];
        
                var vicbank = cia2.cia2getVICbank()&0xffff;
                vicbank = (3 - vicbank) * 0x4000;
                var memsetup2 = (((this.memoryControlReg_d018 >> 4) & 0x0f) * 0x400);
        
                var sprbaseAddress = (mmu.readAddr((vicbank | memsetup2 | 0x3f8) + spritenum)) * 64;
        
                var sprExpandHorz = ((this.spriteExpandHorizontal_d01d & (1 << spritenum)) != 0);
                var sprExpandVert = ((this.spriteExpandVertical_d017 & (1 << spritenum)) != 0);

                var runxpos=chpx+posx;
                var runypos=chpy+posy;

                if ((this.spriteMulticolorMode_d01c & (1 << spritenum)) == 0)        
                {
                    // sprite is monochromatic
                    for (var ybyte=0;ybyte<21;ybyte++)
                    {
                        for (var xbyte=0;xbyte<3;xbyte++)
                        {
                            var curbyte = mmu.readAddr((vicbank | sprbaseAddress) + (xbyte+(ybyte*3)));

                            for (var bit = 0; bit < 8; bit++)
                            {
                                if ((curbyte & (1 << (7 - bit))) > 0)
                                {
                                    this.frameBuffer[0+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[6];
                                    this.frameBuffer[1+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[7];
                                    this.frameBuffer[2+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[8];
                                    this.frameBuffer[3+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=255;

                                    if (sprExpandVert)
                                    {
                                        this.frameBuffer[0+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[6];
                                        this.frameBuffer[1+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[7];
                                        this.frameBuffer[2+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[8];
                                        this.frameBuffer[3+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=255;
                                    }

                                    if (sprExpandHorz)
                                    {
                                        this.frameBuffer[4+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[6];
                                        this.frameBuffer[5+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[7];
                                        this.frameBuffer[6+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[8];
                                        this.frameBuffer[7+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=255;

                                        if (sprExpandVert)
                                        {
                                            this.frameBuffer[4+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[6];
                                            this.frameBuffer[5+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[7];
                                            this.frameBuffer[6+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[8];
                                            this.frameBuffer[7+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=255;
                                        }
                                    }
                                }

                                if (!sprExpandHorz) runxpos++;
                                else runxpos+=2;
                            }
                        }

                        runxpos=chpx+posx;
                        
                        if (!sprExpandVert) runypos++;
                        else runypos+=2;
                    }
                }
                else
                {
                    // sprite is multicolor

                    colArray[3]=this.c64palette[(this.spriteMulticolor0_d025*3)+0];
                    colArray[4]=this.c64palette[(this.spriteMulticolor0_d025*3)+1];
                    colArray[5]=this.c64palette[(this.spriteMulticolor0_d025*3)+2];

                    colArray[9]=this.c64palette[(this.spriteMulticolor1_d026*3)+0];
                    colArray[10]=this.c64palette[(this.spriteMulticolor1_d026*3)+1];
                    colArray[11]=this.c64palette[(this.spriteMulticolor1_d026*3)+2];

                    for (var ybyte=0;ybyte<21;ybyte++)
                    {
                        for (var xbyte=0;xbyte<3;xbyte++)
                        {
                            var curbyte = mmu.readAddr((vicbank | sprbaseAddress) + (xbyte+(ybyte*3)));

                            for (var bit = 0; bit < 4; bit++)
                            {
                                var bay = (curbyte >> (6 - (bit * 2))) & 0x03;
                                if (bay > 0)
                                {
                                    this.frameBuffer[0+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                    this.frameBuffer[1+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                    this.frameBuffer[2+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                    this.frameBuffer[3+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=255;
                                    this.frameBuffer[4+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                    this.frameBuffer[5+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                    this.frameBuffer[6+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                    this.frameBuffer[7+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=255;

                                    if (sprExpandVert)
                                    {
                                        this.frameBuffer[0+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                        this.frameBuffer[1+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                        this.frameBuffer[2+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                        this.frameBuffer[3+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=255;
                                        this.frameBuffer[4+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                        this.frameBuffer[5+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                        this.frameBuffer[6+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                        this.frameBuffer[7+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=255;
                                    }

                                    if (sprExpandHorz)
                                    {
                                        this.frameBuffer[8+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                        this.frameBuffer[9+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                        this.frameBuffer[10+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                        this.frameBuffer[11+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=255;
                                        this.frameBuffer[12+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                        this.frameBuffer[13+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                        this.frameBuffer[14+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                        this.frameBuffer[15+(runxpos*4)+(runypos*this.xResolutionTotal)*4]=255;

                                        if (sprExpandVert)
                                        {
                                            this.frameBuffer[8+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                            this.frameBuffer[9+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                            this.frameBuffer[10+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                            this.frameBuffer[11+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=255;
                                            this.frameBuffer[12+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[0+bay*3];
                                            this.frameBuffer[13+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[1+bay*3];
                                            this.frameBuffer[14+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=colArray[2+bay*3];
                                            this.frameBuffer[15+(runxpos*4)+((runypos+1)*this.xResolutionTotal)*4]=255;
                                        }
                                    }
                                }

                                if (!sprExpandHorz) runxpos+=2;
                                else runxpos+=4;
                            }
                        }

                        runxpos=chpx+posx;
                        
                        if (!sprExpandVert) runypos++;
                        else runypos+=2;
                    }                    

                }
            }
        }        
    }

    drawBorder()
    {
        var palnum=this.foregroundColor;
        var p1=this.c64palette[(palnum*3)+0];
        var p2=this.c64palette[(palnum*3)+1];
        var p3=this.c64palette[(palnum*3)+2];

        for (var i=0;i<(this.xResolutionTotal*this.yUpperBorderWidth*4);i+=4)
        {
            this.frameBuffer[i+0]=p1;
            this.frameBuffer[i+1]=p2;
            this.frameBuffer[i+2]=p3;
            this.frameBuffer[i+3]=255;
        }        

        for (var y=this.yUpperBorderWidth;y<(this.yResolutionTotal-this.yUpperBorderWidth);y++)
        {
            for (var x=0;x<this.xLeftBorderWidth;x++)
            {
                this.frameBuffer[0+(x*4)+(y*this.xResolutionTotal*4)]=p1;
                this.frameBuffer[1+(x*4)+(y*this.xResolutionTotal*4)]=p2;
                this.frameBuffer[2+(x*4)+(y*this.xResolutionTotal*4)]=p3;
                this.frameBuffer[3+(x*4)+(y*this.xResolutionTotal*4)]=255;
            }
        }

        for (var y=this.yUpperBorderWidth;y<(this.yResolutionTotal-this.yUpperBorderWidth);y++)
        {
            for (var x=this.xLeftBorderWidth+320;x<this.xResolutionTotal;x++)
            {
                this.frameBuffer[0+(x*4)+(y*this.xResolutionTotal*4)]=p1;
                this.frameBuffer[1+(x*4)+(y*this.xResolutionTotal*4)]=p2;
                this.frameBuffer[2+(x*4)+(y*this.xResolutionTotal*4)]=p3;
                this.frameBuffer[3+(x*4)+(y*this.xResolutionTotal*4)]=255;
            }
        }

        for (var i=(this.yUpperBorderWidth+200)*this.xResolutionTotal*4;i<(this.xResolutionTotal*this.yResolutionTotal*4);i+=4)
        {
            this.frameBuffer[i+0]=p1;
            this.frameBuffer[i+1]=p2;
            this.frameBuffer[i+2]=p3;
            this.frameBuffer[i+3]=255;
        }        

    }

    simpleRenderer(canvasName,px,py,mmu,cia2)
    {
        var canvas = document.getElementById(canvasName);
        var ctx = canvas.getContext("2d");

        if ((this.screencontrol1_d011 & 0x10)!=0) // screen not blanked
        {
            if ((this.screencontrol1_d011&0x20)==0)
            {
                // draw inner area
                var colorRamAddr=0xd800;
                var chpx=px+this.xLeftBorderWidth;
                var chpy=py+this.yUpperBorderWidth;

                var vicbank = cia2.cia2getVICbank();
                vicbank = (3 - vicbank) * 0x4000;
                var videopage = (((this.memoryControlReg_d018 >> 4) & 0x0f) * 0x400);

                var mempos = ((this.memoryControlReg_d018 >> 1) & 7) * 0x800;
                mempos |= vicbank;

                for (var y=0;y<this.charmodeNumychars;y++)
                {
                    for (var x=0;x<this.charmodeNumxchars;x++)
                    {
                        var currentChar=mmu.readAddr(videopage+(x+(y*this.charmodeNumxchars)));
                        var currentCharCol=mmu.readAddr(colorRamAddr)&0x0f;
                        this.drawChar(chpx,chpy,currentChar,currentCharCol,ctx,mmu.chargenROM,cia2,mmu,mempos,y,x);

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

            //
            // sprites
            //

            var chpx=px+this.xLeftBorderWidth;
            var chpy=py+this.yUpperBorderWidth;
            this.drawSprites(chpx,chpy,mmu,cia2);
        }
        else
        {
            // screen blanked
            var palnum=this.foregroundColor;
            var p1=this.c64palette[(palnum*3)+0];
            var p2=this.c64palette[(palnum*3)+1];
            var p3=this.c64palette[(palnum*3)+2];
    
            for (var p=0;p<(this.xResolutionTotal*this.yResolutionTotal*4);p+=4)            
            {
                this.frameBuffer[p+0]=p1;
                this.frameBuffer[p+1]=p2;
                this.frameBuffer[p+2]=p3;
                this.frameBuffer[p+3]=255;
            }
        }

        this.drawBorder();

        // spit it all out
        if (this.imgData==undefined) this.imgData = ctx.getImageData(0, 0, this.xResolutionTotal, this.yResolutionTotal);
        this.imgData.data.set(this.frameBuffer);

        if (this.canvasRenderer==undefined)
        {
            this.canvasRenderer = document.createElement('canvas');
            this.canvasRenderer.width = this.imgData.width;
            this.canvasRenderer.height = this.imgData.height;
        }
        this.canvasRenderer.getContext('2d').putImageData(this.imgData, 0, 0);
        ctx.drawImage(this.canvasRenderer, px,py, this.xResolutionTotal, this.yResolutionTotal);
    }
}
