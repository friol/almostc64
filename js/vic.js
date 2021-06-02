/* c64 mythical VIC-II chip */

class vic
{
    constructor()
    {
        this.imgData=undefined;
        this.canvasRenderer=undefined;

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

        this.rasterTicker=0;
        this.currentRasterLine=0;
        this.rasterLines = 312; // PAL C64

        this.xResolutionTotal=402;
        this.yResolutionTotal=284;
        this.xLeftBorderWidth=41;
        this.yUpperBorderWidth=36;
        this.vblankWidth=14;

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
            this.frameBuffer[i]=0;
        }        

        this.byteFrameBuffer=new Uint8ClampedArray(this.xResolutionTotal*this.yResolutionTotal);
        for (var i=0;i<this.xResolutionTotal*this.yResolutionTotal;i++)
        {
            this.byteFrameBuffer[i]=0;            
        }

        this.spriteFrameBuffer=new Uint8ClampedArray(this.xResolutionTotal*this.yResolutionTotal); // for spr-spr collision
        for (var i=0;i<this.xResolutionTotal*this.yResolutionTotal;i++)
        {
            this.spriteFrameBuffer[i]=0;            
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

    setCPU(theCpu)
    {
        this.theCpu=theCpu;
    }

    setMMU(theMMU)
    {
        this.theMmu=theMMU;
    }

    updateVic(clocksElapsed,theCpu)
    {
        this.rasterTicker += clocksElapsed;

        var changedRasterline=false;

        var clocksPerRasterline = 63;
        if ((this.currentRasterLine>=this.yUpperBorderWidth+this.vblankWidth)&&((this.currentRasterLine%8)==0)&&(this.currentRasterLine<(this.yUpperBorderWidth+200+this.vblankWidth)))
        {
            // bad line
            clocksPerRasterline=23;
        }

        if (this.rasterTicker >= clocksPerRasterline)
        {
            this.rasterTicker -= clocksPerRasterline;
            this.currentRasterLine++;
            changedRasterline=true;
            if (this.currentRasterLine >= this.rasterLines)
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

        return changedRasterline;
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
            //console.log("VIC::write ["+value+"] to reg ["+addr.toString(16)+"]");
            if ((addr%2)==0) this.spritePositionsX[(addr&0x0f)>>1]=value;
            else this.spritePositionsY[((addr&0x0f)-1)>>1]=value;
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

            this.irqFlagRegister_d019 = (this.irqFlagRegister_d019 & ((~value) & 0x0f));
            if ((this.irqFlagRegister_d019 & this.irqEnable_d01a) != 0)
            {
                this.irqFlagRegister_d019 |= 0x80;
            }
            else
            {
                // irq acknowledged
                this.theCpu.vicIrqPending=false;
            }
        }        
        else if (addr==0xd01a)
        {
            this.irqEnable_d01a=value&0x0f;

            //irq_mask = (byte)(abyte & 0x0f);
            if ((this.irqFlagRegister_d019 & this.irqEnable_d01a) != 0)
            {	
                // Trigger interrupt if pending and now allowed
                this.irqFlagRegister_d019 |= 0x80;
                this.theCpu.vicIrqPending=true;
            }
            else
            {
                this.irqFlagRegister_d019 &= 0x7f;
                this.theCpu.vicIrqPending=false;
            }
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
        /*else if (addr==0xd01e)
        {
            this.spriteToSpriteCollision_d01e=value;
        }*/
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
        else if ((addr>=0xd02f)&&(addr<=0xd03f))
        {
            // unused
        }   
        else
        {
            console.log("VIC::write ["+value.toString(16)+"] to unhandled reg "+addr.toString(16)+" (remapped: "+((addr % 0x40) | 0xd000).toString(16)+")");
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
            if ((addr%2)==0) return this.spritePositionsX[(addr&0x0f)>>1];
            else return this.spritePositionsY[((addr&0x0f)-1)>>1];
        }
        else if (addr==0xd010)
        {
            return this.spritePositionXupperbit_d010;
        }
        else if (addr==0xd011)
        {
            /*var ret = (this.screencontrol1_d011 & 0x7f);
            if (this.currentRasterLine >= 256) ret |= 0x80;*/
            //return (byte)((ctrl1 & 0x7f) | ((raster_y & 0x100) >> 1));

            return ((this.screencontrol1_d011 & 0x7f)|((this.currentRasterLine&0x100)>>1))&0xff;
        }
        else if (addr == 0xD012)
        {
            return (this.currentRasterLine & 0xff);
        }
        else if (addr == 0xD013)
        {
            return 213; // FIXXX light pen x
        }
        else if (addr == 0xD014)
        {
            return 120; // FIXXX light pen y
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
            var val=this.spriteToSpriteCollision_d01e;
            this.spriteToSpriteCollision_d01e=0;
            return val;
        }
        else if (addr == 0xd01f)
        {
            return 0x00; // FIXXX sprite to background collision
        }        
        else if (addr==0xd020)
        {
            return (this.foregroundColor);
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
        else if (addr==0xd026)
        {
            return this.spriteMulticolor1_d026;
        }
        else if ((addr>=0xd027)&&(addr<=0xd02e))
        {
            return this.spriteColors_d027_d02e[addr-0xd027];
        }
        else if ((addr>=0xd02f)&&(addr<=0xd03f))
        {
            // unused
            return 0xff;
        }   
        else
        {
            console.log("VIC::read - unhandled reg "+addr.toString(16));
        }

        return 0;
    }

    //
    // draw a rasterline of chars
    //

    drawCharRasterline(cia2,mmu,curScanline,isbg)
    {
        var extendedColorTextMode=false;
        if (this.screencontrol1_d011&0x40)
        {
            extendedColorTextMode=true;            
        }

        var multicolorMode=false;
        if (this.controlreg2_d016&0x10)
        {
            multicolorMode=true;
        }

        //

        var vicbank = cia2.cia2getVICbank();
        var realvicbank = (3 - vicbank) * 0x4000;

        var memsetup2 = (((this.memoryControlReg_d018 >> 4) & 0x0f) * 0x400);
        var vicbase = memsetup2 | realvicbank;

        var mempos = (((this.memoryControlReg_d018 >> 1) & 0x07) * 0x800) | realvicbank;

        //

        var yscroll=this.screencontrol1_d011&0x07;
        var yscrollamt=yscroll-3;

        var row=Math.floor((curScanline-yscrollamt-this.yUpperBorderWidth)/8);
        if (row<0) return;

        var chpx=this.xLeftBorderWidth;
        var y=(curScanline-yscrollamt-this.yUpperBorderWidth)&0x07;

        // inner area
        for (var xpos=0;xpos<(this.charmodeNumxchars);xpos++)
        {
            var currentChar = mmu.readAddr((row * 40) + xpos + vicbase,true);
            var currentCharCol=mmu.colorram[(row*this.charmodeNumxchars)+xpos]&0x0f;

            var bgColorNumber=0;
            if (extendedColorTextMode) 
            {
                bgColorNumber=(currentChar>>6)&0x03;
                currentChar&=0x3f;
            }
    
            var curbyte;
            curbyte = mmu.readAddr(mempos + ((currentChar * 8) + y),true);
    
            if (multicolorMode && ((currentCharCol&0x08)!=0))
            {
                var xrasterscroll=this.controlreg2_d016&0x7;

                // draw as multicolor char
                for (var x=0;x<8;x+=2)
                {
                    var cur2bits = (curbyte >> (6 - x)) & 0x03;
                    if (cur2bits<0x03)
                    {
                        if ( ((isbg)&&((cur2bits==0)||(cur2bits==1))) || ((!isbg)&&((cur2bits!=0)&&(cur2bits!=1))) ) this.byteFrameBuffer[(chpx+x+xrasterscroll)+(curScanline*this.xResolutionTotal)]=this.backgroundColor[cur2bits];
                        if ( ((isbg)&&((cur2bits==0)||(cur2bits==1))) || ((!isbg)&&((cur2bits!=0)&&(cur2bits!=1))) ) this.byteFrameBuffer[(chpx+x+1+xrasterscroll)+(curScanline*this.xResolutionTotal)]=this.backgroundColor[cur2bits];
                    }
                    else
                    {
                        if (!isbg) this.byteFrameBuffer[(chpx+x+xrasterscroll)+(curScanline*this.xResolutionTotal)]=currentCharCol&7;
                        if (!isbg) this.byteFrameBuffer[(chpx+x+1+xrasterscroll)+(curScanline*this.xResolutionTotal)]=currentCharCol&7;
                    }
                }
            }
            else
            {
                var xrasterscroll=this.controlreg2_d016&0x7;
                for (var x=0;x<8;x++)
                {
                    var curbit=(curbyte>>(7-x))&0x01;
                    if (curbit)
                    {
                        if (!isbg) this.byteFrameBuffer[(chpx+x+xrasterscroll)+(curScanline*this.xResolutionTotal)]=currentCharCol;
                    }
                    else
                    {
                        //if (this.spriteFrameBuffer[(chpx+x+xrasterscroll)+(curScanline*this.xResolutionTotal)]==0) this.byteFrameBuffer[(chpx+x+xrasterscroll)+(curScanline*this.xResolutionTotal)]=this.backgroundColor[bgColorNumber];
                        if (isbg) this.byteFrameBuffer[(chpx+x+xrasterscroll)+(curScanline*this.xResolutionTotal)]=this.backgroundColor[bgColorNumber];
                    }
                }
            }

            chpx+=8;
        }

        // left border
        var lbAdder=((this.controlreg2_d016&0x08)==0)?8:0;
        for (var xlb=0;xlb<(this.xLeftBorderWidth+lbAdder);xlb++)
        {
            this.byteFrameBuffer[xlb+(curScanline*this.xResolutionTotal)]=this.foregroundColor;
        }

        // right border
        var rbAdder=((this.controlreg2_d016&0x08)==0)?8:0;
        for (var xlb=this.xLeftBorderWidth+320-rbAdder;xlb<this.xResolutionTotal;xlb++)
        {
            this.byteFrameBuffer[xlb+(curScanline*this.xResolutionTotal)]=this.foregroundColor;
        }

        //this.byteFrameBuffer[10+(curScanline*this.xResolutionTotal)]=2;        
    }

    //
    // draw a slice of a bitmap screen
    //

    drawBitmapScreenRasterline(mmu,cia2,scanLine)
    {
        var vicBaseAddr = (~cia2.dataPortA & 0x03) << 14;
        var vicscreenMemoryAddr = (this.memoryControlReg_d018 & 0xf0) << 6;
        var basecoladdr=vicBaseAddr+vicscreenMemoryAddr;

        var bitmapMemoryAddr = (this.memoryControlReg_d018 & 0x08) << 10;
        var baseaddr=vicBaseAddr+bitmapMemoryAddr;

        var colorRamPos=0;

        var row=Math.floor((scanLine-this.yUpperBorderWidth)/8);
        var yshift=Math.floor((scanLine-this.yUpperBorderWidth))%8;

        basecoladdr+=row*40;
        baseaddr+=((row*40)*8)+(yshift);
        colorRamPos=row*40;

        var x=this.xLeftBorderWidth;
        for (var b=0;b<40;b++)
        {
            if ((this.controlreg2_d016 & 0x10) == 0)
            {
                // monochrome bitmap graphics
    
                var bytecol=mmu.readAddr(basecoladdr,true);
                var bytepix=mmu.readAddr(baseaddr,true);

                for (var px=0;px<8;px++)
                {
                    var curbit=(bytepix>>(7-px))&0x01;
                    if (curbit)
                    {
                        this.byteFrameBuffer[x+px+(scanLine*this.xResolutionTotal)]=bytecol>>4;
                    }
                    else
                    {
                        this.byteFrameBuffer[x+px+(scanLine*this.xResolutionTotal)]=bytecol&0x0f;
                    }
                }

                baseaddr+=8;
                basecoladdr++;
                x+=8;
            }
            else
            {
                // multicolor bitmap graphics

                var colorArray=new Array(4);
                colorArray[0]=this.backgroundColor[0];

                var bytecol=mmu.readAddr(basecoladdr,true);

                colorArray[1]=(bytecol>>4)&0x0f;
                colorArray[2]=(bytecol&0x0f);

                var colRamVal=mmu.colorram[colorRamPos]&0x0f;
                colorArray[3]= colRamVal;

                var bytepix=mmu.readAddr(baseaddr,true);

                for (var px=0;px<8;px+=2)
                {
                    var cur2bits=(bytepix>>(6-px))&0x03;

                    this.byteFrameBuffer[x+px+(scanLine*this.xResolutionTotal)]=colorArray[cur2bits];
                    this.byteFrameBuffer[1+x+px+(scanLine*this.xResolutionTotal)]=colorArray[cur2bits];
                }

                baseaddr+=8;
                basecoladdr++;
                x+=8;
            }

            colorRamPos+=1;
        }
    }

    updateSpriteFramebuffer(pos,spriteNum)
    {
        if (this.spriteFrameBuffer[pos]!=0)
        {
            // collision spr-spr: set bits for spriteNum and spriteFrameBuffer[pos] in register $d01e
            var spra=spriteNum;
            var sprb=this.spriteFrameBuffer[pos];

            this.spriteToSpriteCollision_d01e|=(1<<spra);
            this.spriteToSpriteCollision_d01e|=(1<<sprb);
        }
        else
        {
            this.spriteFrameBuffer[pos]=spriteNum;
        }
    }

    drawSprites(chpx,chpy,mmu,cia2,curScanline,priorityVal)
    {
        chpx-=24;
        chpy-=50;

        var vicbank = cia2.cia2getVICbank();
        var vicBaseAddr = (3-vicbank) * 0x4000;
        var vicscreenMemoryAddr = (((this.memoryControlReg_d018 >> 4) & 0x0f) * 0x400);
        var spritePointers=vicBaseAddr+vicscreenMemoryAddr+(1024-8);

        var colArray=new Array(4);

        for (var spritenum = 7; spritenum >=0; spritenum--)
        {
            if ( ((this.spriteEnable_d015 & (1 << spritenum)) != 0) && (((this.spriteBackgroundPriority_d01b&(1<<spritenum))>>spritenum)==priorityVal) )
            {
                var sprcolornum = this.spriteColors_d027_d02e[spritenum] & 0x0f;
                colArray[2]=sprcolornum;
        
                var posx = this.spritePositionsX[spritenum];
                if ((this.spritePositionXupperbit_d010 & (1 << spritenum)) > 0) posx |= 256;
                var posy = this.spritePositionsY[spritenum];
             
                var sprExpandHorz = ((this.spriteExpandHorizontal_d01d & (1 << spritenum)) != 0);
                var sprExpandVert = ((this.spriteExpandVertical_d017 & (1 << spritenum)) != 0);

                var runxpos=chpx+posx;
                var runypos=chpy+posy;

                if ((this.spriteMulticolorMode_d01c & (1 << spritenum)) == 0)        
                {
                    // sprite is monochromatic
                    for (var ybyte=0;ybyte<21;ybyte++)
                    {
                        if ((curScanline==runypos)||(curScanline==(runypos+1)))
                        {
                            for (var xbyte=0;xbyte<3;xbyte++)
                            {
                                var saddr = vicBaseAddr+(mmu.readAddr(spritePointers + spritenum,true) << 6);
                                var curbyte = mmu.readAddr(saddr + (xbyte+(ybyte*3)),true);

                                for (var bit = 0; bit < 8; bit++)
                                {
                                    if ((curbyte & (1 << (7 - bit))) > 0)
                                    {
                                        if (runypos==curScanline)
                                        {
                                            this.byteFrameBuffer[runxpos+(runypos*this.xResolutionTotal)]=sprcolornum;
                                            this.updateSpriteFramebuffer(runxpos+(runypos*this.xResolutionTotal),spritenum);
                                        }

                                        if (sprExpandVert)
                                        {
                                            if ((runypos+1)==curScanline)
                                            {
                                                this.byteFrameBuffer[runxpos+((runypos+1)*this.xResolutionTotal)]=sprcolornum;
                                                this.updateSpriteFramebuffer(runxpos+(runypos*this.xResolutionTotal),spritenum);
                                            }
                                        }

                                        if (sprExpandHorz)
                                        {
                                            if (runypos==curScanline)
                                            {
                                                this.byteFrameBuffer[1+runxpos+((runypos)*this.xResolutionTotal)]=sprcolornum;
                                                this.updateSpriteFramebuffer(1+runxpos+(runypos*this.xResolutionTotal),spritenum);
                                            }

                                            if (sprExpandVert)
                                            {
                                                if ((runypos+1)==curScanline)
                                                {
                                                    this.byteFrameBuffer[1+runxpos+((runypos+1)*this.xResolutionTotal)]=sprcolornum;
                                                    this.updateSpriteFramebuffer(1+runxpos+((runypos+1)*this.xResolutionTotal),spritenum);
                                                }
                                            }
                                        }
                                    }

                                    if (!sprExpandHorz) runxpos++;
                                    else runxpos+=2;
                                }
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

                    colArray[1]=this.spriteMulticolor0_d025;
                    colArray[3]=this.spriteMulticolor1_d026;

                    for (var ybyte=0;ybyte<21;ybyte++)
                    {
                        if ((curScanline==runypos)||(curScanline==(runypos+1)))
                        {
                            for (var xbyte=0;xbyte<3;xbyte++)
                            {
                                var saddr = vicBaseAddr+(mmu.readAddr(spritePointers + spritenum,true) << 6);
                                var curbyte = mmu.readAddr(saddr + (xbyte+(ybyte*3)),true);

                                for (var bit = 0; bit < 4; bit++)
                                {
                                    var bay = (curbyte >> (6 - (bit * 2))) & 0x03;
                                    if (bay > 0)
                                    {
                                        if (runypos==curScanline)
                                        {
                                            this.byteFrameBuffer[runxpos+(runypos*this.xResolutionTotal)]=colArray[bay];
                                            this.byteFrameBuffer[1+runxpos+(runypos*this.xResolutionTotal)]=colArray[bay];

                                            this.updateSpriteFramebuffer(runxpos+(runypos*this.xResolutionTotal),spritenum);
                                            this.updateSpriteFramebuffer(1+runxpos+(runypos*this.xResolutionTotal),spritenum);
                                        }

                                        if (sprExpandVert)
                                        {
                                            if ((runypos+1)==curScanline)
                                            {
                                                this.byteFrameBuffer[runxpos+((runypos+1)*this.xResolutionTotal)]=colArray[bay];
                                                this.byteFrameBuffer[1+runxpos+((runypos+1)*this.xResolutionTotal)]=colArray[bay];

                                                this.updateSpriteFramebuffer(runxpos+((runypos+1)*this.xResolutionTotal),spritenum);
                                                this.updateSpriteFramebuffer(1+runxpos+((runypos+1)*this.xResolutionTotal),spritenum);
                                            }
                                        }

                                        if (sprExpandHorz)
                                        {
                                            if (runypos==curScanline)
                                            {
                                                this.byteFrameBuffer[2+runxpos+((runypos)*this.xResolutionTotal)]=colArray[bay];
                                                this.byteFrameBuffer[3+runxpos+((runypos)*this.xResolutionTotal)]=colArray[bay];

                                                this.updateSpriteFramebuffer(2+runxpos+((runypos)*this.xResolutionTotal),spritenum);
                                                this.updateSpriteFramebuffer(3+runxpos+((runypos)*this.xResolutionTotal),spritenum);
                                            }

                                            if (sprExpandVert)
                                            {
                                                if ((runypos+1)==curScanline)
                                                {
                                                    this.byteFrameBuffer[2+runxpos+((runypos+1)*this.xResolutionTotal)]=colArray[bay];
                                                    this.byteFrameBuffer[3+runxpos+((runypos+1)*this.xResolutionTotal)]=colArray[bay];

                                                    this.updateSpriteFramebuffer(2+runxpos+((runypos+1)*this.xResolutionTotal),spritenum);
                                                    this.updateSpriteFramebuffer(3+runxpos+((runypos+1)*this.xResolutionTotal),spritenum);
                                                }
                                            }
                                        }
                                    }

                                    if (!sprExpandHorz) runxpos+=2;
                                    else runxpos+=4;
                                }
                            }
                        }

                        runxpos=chpx+posx;
                        
                        if (!sprExpandVert) runypos++;
                        else runypos+=2;
                    }                    

                }
            }
        }        

        // spr to spr irq
        if (this.spriteToSpriteCollision_d01e==0)
        {
            this.intstatusreg |= 0x04;
            if ((this.irqEnable_d01a & 0x04) !=0)
            {
                // trigger irq
                this.theCpu.vicIrqPending=true;
                this.intstatusreg |= 0x80;
            }
        }        
    }

    //
    // scanline renderer
    //

    scanlineRenderer(canvasName,px,py,mmu,cia2,slOverride=null)
    {
        var curScanline=this.currentRasterLine-1;
        if (curScanline<0) curScanline=this.rasterLines-1;

        if ((curScanline<this.vblankWidth)||(curScanline>=(284+this.vblankWidth))) return;

        if (slOverride!=null)
        {
            curScanline=slOverride;
        }

        var upperBorderAdder=0;
        if ((this.screencontrol1_d011 & 0x10)!=0) // screen not blanked
        {
            if ((this.screencontrol1_d011&0x20)==0) // bitmap mode?
            {
                if ((this.screencontrol1_d011&0x08)==0) upperBorderAdder=4;

                // are we in a border scanline?
                if ( (curScanline<(this.yUpperBorderWidth+this.vblankWidth+upperBorderAdder)) || (curScanline>=(this.yUpperBorderWidth+this.vblankWidth+200-upperBorderAdder)) )
                {
                    for (var p=(this.xResolutionTotal*(curScanline-this.vblankWidth));p<(this.xResolutionTotal*(curScanline-this.vblankWidth+1));p++)            
                    {
                        this.byteFrameBuffer[p]=this.foregroundColor;
                    }
                }
                else
                {
                    this.drawCharRasterline(cia2,mmu,curScanline-this.vblankWidth,true);
                    // background sprites
                    if (curScanline>=50) this.drawSprites(px+this.xLeftBorderWidth,py+this.yUpperBorderWidth,mmu,cia2,curScanline-this.vblankWidth,1);
                    this.drawCharRasterline(cia2,mmu,curScanline-this.vblankWidth,false);
                }
            }
            else
            {
                // bitmap mood
                if ( (curScanline>=(this.yUpperBorderWidth+this.vblankWidth+upperBorderAdder)) && (curScanline<(this.yUpperBorderWidth+this.vblankWidth+200-upperBorderAdder)) )
                {
                    this.drawBitmapScreenRasterline(mmu,cia2,curScanline-this.vblankWidth);
                }
            }

            // foreground sprites
            if (curScanline>=50) this.drawSprites(px+this.xLeftBorderWidth,py+this.yUpperBorderWidth,mmu,cia2,curScanline-this.vblankWidth,0);
        }
        else
        {
            // screen blanked
            for (var p=(this.xResolutionTotal*(curScanline-this.vblankWidth));p<(this.xResolutionTotal*(curScanline-this.vblankWidth+1));p++)            
            {
                this.byteFrameBuffer[p]=this.foregroundColor;
            }
        }
    }

    //
    // blitter
    //

    blit(canvasName,px,py)
    {
        // report framebuffer data on RGBA framebuffer

        var canvas = document.getElementById(canvasName);
        var ctx = canvas.getContext("2d");

        var pos=0;
        for (var p=0;p<(this.xResolutionTotal*this.yResolutionTotal);p++)
        {
            this.frameBuffer[pos]=this.c64palette[(this.byteFrameBuffer[p]*3)+0];
            this.frameBuffer[pos+1]=this.c64palette[(this.byteFrameBuffer[p]*3)+1];
            this.frameBuffer[pos+2]=this.c64palette[(this.byteFrameBuffer[p]*3)+2];
            this.frameBuffer[pos+3]=255;
            pos+=4;
        }

        // clear spr-spr collision framebuffer
        for (var i=0;i<this.xResolutionTotal*this.yResolutionTotal;i++)
        {
            this.spriteFrameBuffer[i]=0;            
        }

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
