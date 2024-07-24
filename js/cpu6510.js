/* 6510 CPU */

class cpu6510
{
    constructor(theMmu)
    {
        this.frequency=985248;

        this.startLogging=false;
        this.loggingCount=0;

        this.mmu=theMmu;
        this.mousePosx=0;
        this.mousePosy=0;
        
        this.nmiPending=false;
        this.vicIrqPending=false;
        this.ciaIrqPending=false;
        
        this.CPUstarted=false;

        // instr. table - instr. dimension in bytes, instr. cycles
        this.instructionTable=new Array();

        for (var inum=0;inum<0x100;inum++)
        {
            this.instructionTable[inum]=[1,1,"UNK"];
        }

        this.instructionTable[0x00]=[1,7,`BRK`];
        this.instructionTable[0x01]=[2,6,`ORA (%d,X)`];
        this.instructionTable[0x03]=[2,8,`SLO (%d,X)`]; // undocumented
        this.instructionTable[0x04]=[2,3,`NOP %d`]; // undocumented
        this.instructionTable[0x05]=[2,3,`ORA %d`];
        this.instructionTable[0x06]=[2,5,`ASL %d`];
        this.instructionTable[0x07]=[2,5,`SLO %d`];
        this.instructionTable[0x08]=[1,3,`PHP`];
        this.instructionTable[0x09]=[2,2,`ORA %d`];
        this.instructionTable[0x0A]=[1,2,`ASL`];
        this.instructionTable[0x0B]=[2,2,`ANC %d`]; // undocumented
        this.instructionTable[0x0C]=[3,4,`NOP %d`]; // undocumented
        this.instructionTable[0x0D]=[3,4,`ORA %d`];
        this.instructionTable[0x0E]=[3,6,`ASL %d`];
        this.instructionTable[0x0F]=[3,6,`SLO %d`]; // undocumented

        this.instructionTable[0x10]=[2,2,`BPL %d`];
        this.instructionTable[0x11]=[2,5,`ORA (%d),Y`];
        this.instructionTable[0x13]=[2,8,`SLO (%d),Y`]; // undocumented
        this.instructionTable[0x14]=[2,4,`NOP %d,X`]; // undocumented
        this.instructionTable[0x15]=[2,4,`ORA %d,X`];
        this.instructionTable[0x16]=[2,6,`ASL %d,X`];
        this.instructionTable[0x17]=[2,6,`SLO %d,X`]; // undocumented
        this.instructionTable[0x18]=[1,2,`CLC`];
        this.instructionTable[0x19]=[3,4,`ORA %d,Y`];
        this.instructionTable[0x1A]=[1,2,`NOP`]; // undocumented
        this.instructionTable[0x1B]=[3,7,`SLO %d,Y`]; // undocumented
        this.instructionTable[0x1C]=[3,4,`NOP %d,X`]; // undocumented
        this.instructionTable[0x1D]=[3,4,`ORA %d,X`];
        this.instructionTable[0x1E]=[3,7,`ASL %d,X`];
        this.instructionTable[0x1F]=[3,7,`SLO %d,X`]; // undocumented

        this.instructionTable[0x20]=[3,6,`JSR %d`];
        this.instructionTable[0x21]=[2,6,`AND %d`];
        this.instructionTable[0x24]=[2,3,`BIT %d`];
        this.instructionTable[0x25]=[2,3,`AND %d`];
        this.instructionTable[0x26]=[2,5,`ROL %d`];
        this.instructionTable[0x28]=[1,4,`PLP`];
        this.instructionTable[0x29]=[2,2,`AND %d`];
        this.instructionTable[0x2A]=[1,2,`ROL`];
        this.instructionTable[0x2C]=[3,4,`BIT %d`];
        this.instructionTable[0x2D]=[3,4,`AND %d`];
        this.instructionTable[0x2E]=[3,6,`ROL %d`];

        this.instructionTable[0x30]=[2,2,`BMI %d`];
        this.instructionTable[0x31]=[2,5,`AND (%d),Y`];
        this.instructionTable[0x35]=[2,4,`AND %d`];
        this.instructionTable[0x36]=[2,6,`ROL %d`];
        this.instructionTable[0x38]=[1,2,`SEC`];
        this.instructionTable[0x39]=[3,4,`AND %d,Y`];

        this.instructionTable[0x3C]=[1,2,`NOP`];
        this.instructionTable[0x3D]=[3,4,`AND %d`];

        this.instructionTable[0x3E]=[3,7,`ROL %d,X`];

        this.instructionTable[0x40]=[1,6,`RTI`];
        this.instructionTable[0x41]=[2,6,`EOR (%d,X)`];
        this.instructionTable[0x44]=[2,3,`NOP %d`]; // undocumented
        this.instructionTable[0x45]=[2,3,`EOR %d`];
        this.instructionTable[0x46]=[2,5,`LSR %d`];
        this.instructionTable[0x48]=[1,3,`PHA`];
        this.instructionTable[0x49]=[2,2,`EOR %d`];
        this.instructionTable[0x4A]=[1,2,`LSR`];
        this.instructionTable[0x4B]=[2,2,`ALR %d`]; // undocumented
        this.instructionTable[0x4C]=[3,3,`JMP %d`];
        this.instructionTable[0x4D]=[3,4,`EOR %d`];
        this.instructionTable[0x4E]=[3,6,`LSR %d`];

        this.instructionTable[0x50]=[2,2,`BVC %d`];//*
        this.instructionTable[0x51]=[2,5,`EOR (%d),Y`];//*
        this.instructionTable[0x55]=[2,4,`EOR %d,X`];//*
        this.instructionTable[0x56]=[2,6,`LSR %d,X`];//*
        this.instructionTable[0x58]=[1,2,`CLI`];//*
        this.instructionTable[0x59]=[3,4,`EOR %d,Y`];//*
        this.instructionTable[0x5A]=[1,2,`NOP`]; // undocumented
        this.instructionTable[0x5D]=[3,4,`EOR %d,X`];//*
        this.instructionTable[0x5E]=[3,7,`LSR %d,X`];//*
        this.instructionTable[0x5F]=[3,7,`SRE %d,X`];//*

        this.instructionTable[0x60]=[1,6,`RTS`];
        this.instructionTable[0x61]=[2,6,`ADC (%d,X)`];
        this.instructionTable[0x65]=[2,3,`ADC %d`];
        this.instructionTable[0x66]=[2,5,`ROR %d`];
        this.instructionTable[0x68]=[1,4,`PLA`];
        this.instructionTable[0x69]=[2,2,`ADC %d`];
        this.instructionTable[0x6A]=[1,2,`ROR`];
        this.instructionTable[0x6C]=[3,5,`JMP (%d)`];
        this.instructionTable[0x6D]=[3,4,`ADC %d`];
        this.instructionTable[0x6E]=[3,4,`ROR %d`];

        this.instructionTable[0x70]=[2,2,`BVS %d`];
        this.instructionTable[0x71]=[2,5,`ADC (%d),Y`];//*
        this.instructionTable[0x75]=[2,4,`ADC %d`];
        this.instructionTable[0x76]=[2,6,`ROR %d,X`];
        this.instructionTable[0x78]=[1,2,`SEI`];
        this.instructionTable[0x79]=[3,4,`ADC %d,Y`];
        this.instructionTable[0x7D]=[3,4,`ADC %d,X`];
        this.instructionTable[0x7E]=[3,7,`ROR %d,X`];

        this.instructionTable[0x80]=[1,2,`SKB`];
        this.instructionTable[0x81]=[2,6,`STA %d`];
        this.instructionTable[0x82]=[2,2,`NOP %d`]; // undocumented
        this.instructionTable[0x84]=[2,3,`STY %d`];
        this.instructionTable[0x85]=[2,3,`STA %d`];
        this.instructionTable[0x86]=[2,3,`STX %d`];
        this.instructionTable[0x87]=[2,3,`SAX %d`]; // undocumented
        this.instructionTable[0x88]=[1,2,`DEY`];
        this.instructionTable[0x8A]=[1,2,`TXA`];
        this.instructionTable[0x8C]=[3,4,`STY %d`];
        this.instructionTable[0x8E]=[3,4,`STX %d`];
        this.instructionTable[0x8D]=[3,4,`STA %d`];

        this.instructionTable[0x90]=[2,2,`BCC %d`];
        this.instructionTable[0x91]=[2,6,`STA %d`];
        this.instructionTable[0x94]=[2,4,`STY %d,X`];
        this.instructionTable[0x95]=[2,4,`STA %d,X`];
        this.instructionTable[0x96]=[2,4,`STX %d,Y`];
        this.instructionTable[0x98]=[1,2,`TYA`];
        this.instructionTable[0x99]=[3,5,`STA %d,Y`];
        this.instructionTable[0x9A]=[1,2,`TXS`];
        this.instructionTable[0x9D]=[3,5,`STA %d`];

        this.instructionTable[0xA0]=[2,2,`LDY %d`];
        this.instructionTable[0xA1]=[2,6,`LDA (%d,X)`];
        this.instructionTable[0xA2]=[2,2,`LDX %d`];
        this.instructionTable[0xA4]=[2,3,`LDY %d`];
        this.instructionTable[0xA5]=[2,3,`LDA %d`];
        this.instructionTable[0xA6]=[2,3,`LDX %d`];
        this.instructionTable[0xA7]=[2,3,`LAX %d`];
        this.instructionTable[0xA8]=[1,2,`TAY`];
        this.instructionTable[0xA9]=[2,2,`LDA %d`];
        this.instructionTable[0xAA]=[1,2,`TAX`];
        this.instructionTable[0xAC]=[3,4,`LDY %d`];
        this.instructionTable[0xAE]=[3,4,`LDX %d`];
        this.instructionTable[0xAF]=[3,4,`LAX %d`]; // undocumented
        this.instructionTable[0xAD]=[3,4,`LDA %d`];

        this.instructionTable[0xB0]=[2,2,`BCS %d`];//*
        this.instructionTable[0xB1]=[2,5,`LDA (%d),Y`];//*
        this.instructionTable[0xB3]=[2,5,`LAX (%d),Y`];//*
        this.instructionTable[0xB4]=[2,4,`LDY %d,X`];//*
        this.instructionTable[0xB5]=[2,4,`LDA %d,X`];//*
        this.instructionTable[0xB6]=[2,4,`LDX %d,Y`];//*
        this.instructionTable[0xB7]=[1,2,`LAX %d`]; // undocumented
        this.instructionTable[0xB8]=[1,2,`CLV`];//*
        this.instructionTable[0xB9]=[3,4,`LDA %d,Y`];//*
        this.instructionTable[0xBA]=[1,2,`TSX`];//*
        this.instructionTable[0xBC]=[3,4,`LDY %d,X`];//*
        this.instructionTable[0xBD]=[3,4,`LDA %d,X`];//*
        this.instructionTable[0xBE]=[3,4,`LDX %d,Y`];//*

        this.instructionTable[0xC0]=[2,2,`CPY %d`];
        this.instructionTable[0xC1]=[2,6,`CMP (%d,X)`];
        this.instructionTable[0xC3]=[2,8,`DCP (%d,X)`]; // undocumented
        this.instructionTable[0xC4]=[2,3,`CPY %d`];
        this.instructionTable[0xC5]=[2,3,`CMP %d`];
        this.instructionTable[0xC6]=[2,5,`DEC %d`];
        this.instructionTable[0xC7]=[2,5,`DCP %d`]; // undocumented
        this.instructionTable[0xC8]=[1,2,`INY`];
        this.instructionTable[0xC9]=[2,2,`CMP %d`];
        this.instructionTable[0xCA]=[1,2,`DEX`];
        this.instructionTable[0xCB]=[2,2,`AXS %d`]; // FIXXX num cycles
        this.instructionTable[0xCC]=[3,4,`CPY %d`];
        this.instructionTable[0xCD]=[3,4,`CMP %d`];
        this.instructionTable[0xCE]=[3,6,`DEC %d`];

        this.instructionTable[0xD0]=[2,2,`BNE %d`];//*
        this.instructionTable[0xD1]=[2,5,`CMP (%d),Y`];//*
        this.instructionTable[0xD4]=[2,4,`NOP %d,X`]; // undocumented
        this.instructionTable[0xD5]=[2,4,`CMP %d,X`];
        this.instructionTable[0xD6]=[2,6,`DEC %d,X`];
        this.instructionTable[0xD8]=[1,2,`CLD`];
        this.instructionTable[0xD9]=[3,4,`CMP %d,Y`];
        this.instructionTable[0xDD]=[3,4,`CMP %d,X`];//*
        this.instructionTable[0xDE]=[3,7,`DEC %d,X`];

        this.instructionTable[0xE0]=[2,2,`CPX %d`];
        this.instructionTable[0xE1]=[2,6,`SBC (%d,X)`];
        this.instructionTable[0xE4]=[2,3,`CPX %d`];
        this.instructionTable[0xE5]=[2,3,`SBC %d`];
        this.instructionTable[0xE6]=[2,5,`INC %d`];
        this.instructionTable[0xE8]=[1,2,`INX`];
        this.instructionTable[0xE9]=[2,2,`SBC %d`];
        this.instructionTable[0xEA]=[1,2,`NOP`];
        this.instructionTable[0xEB]=[2,2,`SBC %d`]; // undocumented
        this.instructionTable[0xEC]=[3,4,`CPX %d`];
        this.instructionTable[0xED]=[3,4,`SBC %d`];
        this.instructionTable[0xEE]=[3,6,`INC %d`];

        this.instructionTable[0xF0]=[2,2,`BEQ %d`];
        this.instructionTable[0xF1]=[2,5,`SBC (%d),Y`];//*
        this.instructionTable[0xF5]=[2,4,`SBC %d,X`];
        this.instructionTable[0xF6]=[2,6,`INC %d,X`];
        this.instructionTable[0xF8]=[1,2,`SED`];
        this.instructionTable[0xF9]=[3,4,`SBC %d`];
        this.instructionTable[0xFA]=[1,2,`NOP`]; // undocumented
        this.instructionTable[0xFC]=[3,4,`NOP %d`];
        this.instructionTable[0xFD]=[3,4,`SBC %d,X`];
        this.instructionTable[0xFE]=[3,7,`INC %d,X`];
        this.instructionTable[0xFF]=[3,7,`ISC %d,X`]; // undocumented
    }

    powerUp()
    {
        this.totCycles=0;

        this.a=0;
        this.x=0;
        this.y=0;

        this.flagsC=0;
        this.flagsZ=0;
        this.flagsI=0;
        this.flagsD=0;
        this.flagsB=0;
        this.flagsV=0;
        this.flagsN=0;

        this.sp=0xff;

        // PC = byte at $FFFD * 256 + byte at $FFFC 
        var startAddressLow=this.mmu.readAddr(0xfffc);
        var startAddressHigh=this.mmu.readAddr(0xfffd)*256;
        var startAddress=startAddressLow+(startAddressHigh);

        this.pc=startAddress;
        console.log("Starting with execution at address 0x"+startAddress.toString(16));

        this.CPUstarted=true;
    }

    setMousePos(mx,my)
    {
        this.mousePosx=mx;
        this.mousePosy=my;
    }

    drawDebugInfo(listOfOpcodes,px,py)
    {
        var initialpy=py;

        var fontHeight=16;
        var fontSpace=20;
        var canvas = document.getElementById("mainCanvass");
        var ctx = canvas.getContext("2d");

        ctx.fillColor="white";
        ctx.clearRect(0, 0, canvas.width, canvas.height);        
    
        ctx.font = fontHeight+"px Courier New";
    
        for (var o=0;o<listOfOpcodes.length;o++)
        {
            if (this.pc==listOfOpcodes[o][0])
            {
                ctx.fillStyle="rgb(200,200,200)";
                ctx.fillRect(px, py-fontHeight, 512, fontSpace);
            }
    
            ctx.fillStyle="black";
    
            ctx.fillText(listOfOpcodes[o][0].toString(16), px, py);
            ctx.fillText(listOfOpcodes[o][1], px+82, py);
    
            for (var opc=0;opc<listOfOpcodes[o][2].length;opc++)
            {
                ctx.fillText(listOfOpcodes[o][2][opc].toString(16)+" ",px+250+(opc*26),py);
            }
    
            py+=fontSpace;
        }       
        
        // box with register info

        ctx.fillStyle="black";
        ctx.fillText("A: "+this.a.toString(16)+" X: "+this.x.toString(16)+" Y: "+this.y.toString(16), px+540, initialpy);
        ctx.fillText("SP:"+this.sp.toString(16), px+540, initialpy+fontSpace*1);
        ctx.fillText("PC:"+this.pc.toString(16), px+540, initialpy+fontSpace*2);
        ctx.fillText("NVxBDIZC", px+540, initialpy+fontSpace*3);
        ctx.fillText(this.getFlagsString(), px+540, initialpy+fontSpace*4);
        ctx.fillText("Total CPU cycles:"+this.totCycles.toString(16), px+540, initialpy+fontSpace*5);
        ctx.fillText("Port config:"+this.mmu.processorPortReg.toString(16), px+540, initialpy+fontSpace*6);

        // moused line
        if ((this.mousePosy>=initialpy)&&(this.mousePosx<512)&&(this.mousePosy<(25*fontSpace)))
        {
            ctx.strokeStyle="gray";
            ctx.strokeRect(px,5-(fontSpace*3)+initialpy+Math.floor((this.mousePosy+initialpy)/fontSpace)*fontSpace, 512, fontSpace-2);
        }

    }

    traceLog()
    {
        var debugLog=this.pc.toString(16).padStart(4,'0')+" "+this.a.toString(16).padStart(2,'0')+" "+
        this.x.toString(16).padStart(2,'0')+" "+this.y.toString(16).padStart(2,'0')+" "+this.sp.toString(16).padStart(4,'0')+" "+
        this.getFlagsString();
        //this.totCycles.toString(16);

        if (this.startLogging==true)
        {
            this.loggingCount++;

            //if ((this.loggingCount%100)==0)
            //if ((this.loggingCount>=1050000)&&(this.loggingCount<1051000))
            {
                //if (this.totCycles==2) debugLog="fce2 00 00 00 00ff 0\n"+debugLog;
                var ta=document.getElementById("logText");
                ta.value+=debugLog+"\n";
            }
        }
    }

    runToCursor(initialpy,listOfOpcodes)
    {
        var fontSpace=20;

        if ((this.mousePosy>=initialpy)&&(this.mousePosx<512))
        {
            var mpos=-(fontSpace*3)+initialpy+Math.floor((this.mousePosy+initialpy)/fontSpace)*fontSpace;
            var addrLine=Math.floor(mpos-30)/20;
            return listOfOpcodes[addrLine+1][0];
        }
        else
        {
            return -1;
        }
    }

    getFlagsString()
    {
        var flgString="";

        flgString+=this.flagsN;
        flgString+=this.flagsV;
        flgString+="1";
        flgString+=this.flagsB;
        flgString+=this.flagsD;
        flgString+=this.flagsI;
        flgString+=this.flagsZ;
        flgString+=this.flagsC;

        return flgString;
    }

    doFlagsNZ(operand)
    {
        if ((operand & 0x80)!=0)
        {
            this.flagsN=1;
        }
        else
        {
            this.flagsN=0;
        }

        if (operand == 0x00)
        {
            this.flagsZ=1;
        }
        else
        {
            this.flagsZ=0;
        }
    }

    calcRelativeBranch(operand)
    {
        var branchspan = operand;

        if (operand & 0x80) 
        {
            branchspan = -((~operand) & 0xff) - 1;
        }        

        return (branchspan);
    }

    calcPagecrossPenalty2(address,oldPc)
    {
        /*if (((address ^ oldPc) & 0xff00)!=0)
        {
            return 1;
        }*/

        var newaddr=oldPc+2;

        if ((address>>8)!=(newaddr>>8)) 
        {
            //console.log("Branch penalty ["+(address>>8).toString(16)+"] ["+(oldPc>>8).toString(16)+"]");
            return 1;
        }

        return 0;
    }

    pageCross(indi,y)
    {
        if (((indi & 0xff) + y) >= 0x100) return 1;
        return 0;
    }

    doAdc(iop)
    {
        if (this.flagsD==0)
        {
            var adder = 0;
            if (this.flagsC != 0)
            {
                adder=1;
            }

            var rez = (this.a+iop+adder);

            this.doFlagsNZ((rez & 0xff));

            if (rez > 0xff)
            {
                this.flagsC=1;
            }
            else
            {
                this.flagsC=0;
            }

            if ((((this.a ^ iop) & 0x80) ==0) && (((this.a ^ rez) & 0x80) !=0))
            {
                this.flagsV=1;
            }
            else
            {
                this.flagsV=0;
            }

            this.a = (rez&0xff);        
        }
        else
        {
            var al, ah;
            var abyte = iop&0xff;
            var seaflag = false;
            if (this.flagsC != 0) seaflag = true;

            al = ((this.a & 0x0f) + (abyte & 0x0f) + (seaflag ? 1 : 0))&0xffff;		// Calculate lower nybble
            if (al > 9) al += 6;									// BCD fixup for lower nybble

            ah = ((this.a >> 4) + (abyte >> 4))&0xffff;							// Calculate upper nybble
            if (al > 0x0f) ah++;

            var z_flag = (this.a + abyte + (seaflag ? 1 : 0))&0xff;					// Set flags
            var n_flag = (ah << 4)&0xff;	// Only highest bit used
            var v_flag = (((ah << 4) ^ this.a) & 0x80) != 0 && !(((this.a ^ iop) & 0x80) != 0);

            if (v_flag) this.flagsV=1;
            else this.flagsV=0;

            if ((n_flag&0x80)==0x80) this.flagsN=1;
            else this.flagsN=0;

            if (z_flag) this.flagsZ=0;
            else this.flagsZ=1;

            if (ah > 9) ah += 6;									// BCD fixup for upper nybble

            if (ah > 0x0f) this.flagsC=1;
            else this.flagsC=0;
            this.a = ((ah << 4) | (al & 0x0f))&0xff;							// Compose result
        }
    }

    doSbc(value)
    {
        if (this.flagsD==0)
        {
            var temp = this.a - value - (1 - this.flagsC);

            if (
            ((this.a ^ temp) & 0x80) !== 0 &&
            ((this.a ^ value) & 0x80) !== 0
            ) {
            this.flagsV = 1;
            } else {
            this.flagsV = 0;
            }

            this.flagsC = temp < 0 ? 0 : 1;

            this.a = temp & 0xff;
            this.doFlagsNZ(this.a);
        }
        else
        {
            var al, ah;
            var abyte = value&0xff;
            var seaflag = false;
            if (this.flagsC != 0) seaflag = true;

            var tmp = (this.a - abyte - (seaflag? 0 : 1))&0xffff;

            // Decimal mode
            al = ((this.a & 0x0f) - (abyte & 0x0f) - (seaflag ? 0 : 1))&0xffff;	// Calculate lower nybble
            ah = ((this.a >> 4) - (abyte >> 4))&0xffff;							// Calculate upper nybble
            if ((al & 0x10) != 0)
            {
                al -= 6;											        // BCD fixup for lower nybble
                ah--;
            }
            if ((ah & 0x10) != 0) ah -= 6;									// BCD fixup for upper nybble

            if (tmp < 0x100) this.flagsC=1;
            else this.flagsC=0;

            if (((this.a ^ tmp) & 0x80) != 0 && ((this.a ^ abyte) & 0x80) != 0) this.flagsV=1;
            else this.flagsV=0;

            if ((tmp&0xff) == 0) this.flagsZ=1;
            else this.flagsZ=0;

            var n_flag = tmp&0xff;
            if ((n_flag & 0x80) == 0x80) this.flagsN=1;
            else this.flagsN=0;

            this.a = ((ah << 4) | (al & 0x0f))&0xff;							// Compose result
        }
    }

    irqNmiJump(jumpto)
    {
        this.mmu.writeAddr(0x100 | this.sp,((this.pc >> 8) & 0xff));
        this.sp--;
        if (this.sp<0) this.sp=0xff;
        this.mmu.writeAddr(0x100 | this.sp,((this.pc & 0xff)));
        this.sp--;
        if (this.sp<0) this.sp=0xff;

        var tmp = 0x20;
        if (this.flagsN) tmp |= 0x80;
        if (this.flagsV) tmp |= 0x40;
        //if (this.flagsB) tmp |= 0x10; // FIXXX?
        if (this.flagsD) tmp |= 0x08;
        if (this.flagsI) tmp |= 0x04;
        if (this.flagsZ) tmp |= 0x02;
        if (this.flagsC) tmp |= 0x01;

        this.mmu.writeAddr(0x100 | this.sp, tmp);
        this.sp--;
        if (this.sp<0) this.sp=0xff;

        this.flagsI=1;

        this.pc = this.mmu.readAddr16bit(jumpto);
    }

    executeOneOpcode()
    {
        var elapsedCycles=0;

        if (this.nmiPending||this.vicIrqPending||this.ciaIrqPending)
        {
            if (this.nmiPending) 
            {
                this.nmiPending=false;
                this.irqNmiJump(0xfffa);
                elapsedCycles+=7;
            }
            else if (this.flagsI==0)
            {
                if (this.ciaIrqPending) this.ciaIrqPending=false;
                if (this.vicIrqPending) this.vicIrqPending=false;

                this.irqNmiJump(0xfffe);
                elapsedCycles+=7;
            }
        }

        var jumped=false;
        const nextOpcode=this.mmu.readAddr(this.pc);
        //console.log("Executing opcode "+nextOpcode.toString(16));

        switch (nextOpcode)
        {
            case 0x00:
            {
                // BRK

                this.mmu.writeAddr(0x100 | this.sp,(((this.pc+2) >> 8) & 0xff));
                this.sp--;
                if (this.sp<0) this.sp=0xff;
                this.mmu.writeAddr(0x100 | this.sp,(((this.pc+2) & 0xff)));
                this.sp--;
                if (this.sp<0) this.sp=0xff;

                var tmp = 0x20;
                if (this.flagsN) tmp |= 0x80;
                if (this.flagsV) tmp |= 0x40;
                tmp|=0x10;
                if (this.flagsD) tmp |= 0x08;
                if (this.flagsI) tmp |= 0x04;
                if (this.flagsZ) tmp |= 0x02;
                if (this.flagsC) tmp |= 0x01;

                this.mmu.writeAddr(0x100 | this.sp, tmp);
                this.sp--;
                if (this.sp<0) this.sp=0xff;
                
                this.flagsI=1;

                this.pc = this.mmu.readAddr16bit(0xFFFE);
                jumped=true;
                break;
            }
            case 0x01:
            {
                // ORA (Indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.getWrappedAddr((operand + this.x) & 0xff);
                var iop = this.mmu.readAddr(indi);
                this.a |= iop;
                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x03:
            {
                // SLO (zp,X) undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr((operand+this.x)&0xff);

                this.mmu.writeAddr(operand,(iop*2)&0xff);
                this.a=this.a|((iop*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x04:
            {
                // NOP zeropage undocumented
                console.log("Undoc opcode 0x04");
                break;
            }
            case 0x05:
            {
                // ORA zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var opz=this.mmu.readAddr(operand);
                this.a |= opz;
                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x06:
            {
                // ASL zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var loccontent = this.mmu.readAddr(operand);
                if ((loccontent & 0x80)==0x80)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                loccontent <<= 1;
                this.mmu.writeAddr(operand,loccontent&0xff);
                this.doFlagsNZ(loccontent&0xff);
                break;
            }
            case 0x07:
            {
                // SLO zeropage undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var zpval=this.mmu.readAddr(operand);

                this.mmu.writeAddr(operand,(zpval*2)&0xff);
                this.a=this.a|((zpval*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x08:
            {
                // PHP
                var tmp = 0x20;
                if (this.flagsN) tmp |= 0x80;
                if (this.flagsV) tmp |= 0x40;
                /*if (this.flagsB)*/ tmp |= 0x10;
                if (this.flagsD) tmp |= 0x08;
                if (this.flagsI) tmp |= 0x04;
                if (this.flagsZ) tmp |= 0x02;
                if (this.flagsC) tmp |= 0x01;

                this.mmu.writeAddr(0x100 | this.sp, tmp);
                
                this.sp--;     
                if (this.sp<0) this.sp=0xff;

                break;
            }
            case 0x09:
            {
                // ORA immediate
                var operand=this.mmu.readAddr(this.pc+1);
                this.a |= operand;
                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x0A:
            {
                // ASL
                var loccontent = this.a;
                if ((loccontent & 0x80)==0x80)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                loccontent <<= 1;
                this.a = loccontent&0xff;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x0B:
            {
                // ANC immediate undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                this.a&=operand;

                if ((this.a & 0x80)==0x80)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x0C:
            {
                // NOP absolute undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr16bit(this.pc+1);
                break;
            }
            case 0x0D:
            {
                // ORA absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr(operand);
                this.a |= iop;
                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x0E:
            {
                // ASL absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var loccontent = this.mmu.readAddr(operand);
                if ((loccontent & 0x80)==0x80)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                loccontent <<= 1;
                this.mmu.writeAddr(operand,loccontent&0xff);
                this.doFlagsNZ(loccontent&0xff);
                break;
            }
            case 0x0F:
            {
                // SLO absolute undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr(operand&0xff);

                this.mmu.writeAddr(operand,(iop*2)&0xff);
                this.a=this.a|((iop*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a); 
                break;
            }
            case 0x10:
            {
                // BPL relative (Branch if Positive)
                if (this.flagsN==0)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr(this.pc+1);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                    //console.log("BPL::oldPc ["+oldPc.toString(16)+"] newaddr ["+newaddr.toString(16)+"]");

                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0x11:
            {
                // ORA (operand),Y
                var operand=this.mmu.readAddr(this.pc+1);
                var address=this.mmu.readAddr16bit(operand);
                
                var finalAddress=(address+this.y)&0xffff;
                this.a|=this.mmu.readAddr(finalAddress);
                
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(address,this.y);
                break;
            }
            case 0x13:
            {
                // SLO (operand),Y undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var address=this.mmu.readAddr16bit(operand);
                var finalAddress=(address+this.y)&0xffff;

                var iop=this.mmu.readAddr(finalAddress);

                this.mmu.writeAddr(finalAddress,(iop*2)&0xff);
                this.a=this.a|((iop*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x14:
            {
                // NOP zeropage,X undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0x15:
            {
                // ORA zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr((operand+this.x)&0xff);
                this.a |= iop;
                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x16:
            {
                // ASL zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var loccontent = this.mmu.readAddr((operand+this.x)&0xff);
                if ((loccontent & 0x80)==0x80)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                loccontent <<= 1;
                this.mmu.writeAddr((operand+this.x)&0xff,loccontent&0xff);
                this.doFlagsNZ(loccontent&0xff);
                break;
            }
            case 0x17:
            {
                // SLO zeropage,X undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr((operand+this.x)&0xff);

                this.mmu.writeAddr(operand,(iop*2)&0xff);
                this.a=this.a|((iop*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x18:
            {
                // CLC
                this.flagsC=0;
                break;
            }
            case 0x19:
            {
                // ORA absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr((operand+this.y)&0xffff);
                this.a |= iop;
                this.doFlagsNZ(this.a);            
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0x1A:
            {
                // NOP undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0x1B:
            {
                // SLO abs,Y undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr16bit(this.pc+1);
                var iop = this.mmu.readAddr((operand+this.y)&0xffff);

                this.mmu.writeAddr(operand,(iop*2)&0xff);
                this.a=this.a|((iop*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x1C:
            {
                // NOP absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr((operand+this.x)&0xffff);
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0x1D:
            {
                // ORA absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr((operand+this.x)&0xffff);
                this.a |= iop;
                this.doFlagsNZ(this.a);            
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0x1E:
            {
                // ASL absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var loccontent = this.mmu.readAddr((operand+this.x)&0xffff);
                if ((loccontent & 0x80)==0x80)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                loccontent <<= 1;
                this.mmu.writeAddr((operand+this.x)&0xffff,loccontent&0xff);
                this.doFlagsNZ(loccontent&0xff);
                break;
            }
            case 0x1F:
            {
                // SLO abs,X undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr((operand+this.x)&0xffff);

                this.mmu.writeAddr(operand,(iop*2)&0xff);
                this.a=this.a|((iop*2)&0xff);

                if ((this.a & 0x80)==0x80) // FIXXX?
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x20:
            {
                // JSR absolute
                this.mmu.writeAddr(0x100+this.sp,((this.pc+2)>>8)&0xff);

                this.sp--;
                if (this.sp<0) this.sp=0xff;

                this.mmu.writeAddr(0x100+this.sp,(this.pc+2)&0xff);

                this.sp--;
                if (this.sp<0) this.sp=0xff;

                //var jumpAddress=this.mmu.readAddr16bit(this.pc+1);
                var jumpAddress=this.mmu.readAddr((this.pc+1)&0xffff);
                jumpAddress|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;

                this.pc=jumpAddress;

                jumped=true;
                break;
            }
            case 0x21:
            {
                // AND (indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi=this.mmu.getWrappedAddr((operand+this.x)&0xff);
                var iop=this.mmu.readAddr(indi);
                this.a&=iop;
                this.doFlagsNZ(this.a);            
                break;
            }
            case 0x24:
            {
                // BIT zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var bitz = this.mmu.readAddr(operand);
                var tzt = (this.a & bitz);
                if (tzt == 0)
                {
                    this.flagsZ=1;
                }
                else
                {
                    this.flagsZ=0;
                }

                if ((bitz & 0x80)==0x80)
                {
                    this.flagsN=1;
                }
                else
                {
                    this.flagsN=0;
                }

                if ((bitz & 0x40)==0x40)
                {
                    this.flagsV=1;
                }
                else
                {
                    this.flagsV=0;
                }
                break;
            }
            case 0x25:
            {
                // AND zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var opz = this.mmu.readAddr(operand);
                this.a&=opz;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x26:
            {
                // ROL zeropage
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var opz = this.mmu.readAddr(operand);
                var seventh = ((opz >> 7) & 0x01); // save 7th byte
                opz <<= 1;
                opz = (opz | ((this.flagsC)))&0xff; // byte1=carry
                if (seventh != 0)
                {
                    // set carry
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.mmu.writeAddr(operand, opz);
                this.doFlagsNZ(opz);
                break;
            }
            case 0x28:
            {
                // PLP
                this.sp++;
                this.sp&=0xff;
                var data=this.mmu.readAddr(0x100 | this.sp);

                if ((data & 0x80) != 0) this.flagsN=1;
                else this.flagsN=0;
                if ((data & 0x40) != 0) this.flagsV=1;
                else this.flagsV=0;
                //if ((data & 0x10) != 0) this.flagsB=1;
                //B always popped zero
                this.flagsB=0;
                if ((data & 0x08) != 0) this.flagsD=1;
                else this.flagsD=0;
                if ((data & 0x04) != 0) this.flagsI=1;
                else this.flagsI=0;
                if ((data & 0x02) != 0) this.flagsZ=1;
                else this.flagsZ=0;
                if ((data & 0x01) != 0) this.flagsC=1;        
                else this.flagsC=0;
                break;
            }
            case 0x29:
            {
                // AND immediate
                var operand=this.mmu.readAddr(this.pc+1);
                this.a&=operand;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x2A:
            {
                // ROL accumulator
                var seventh = ((this.a >> 7) & 0x01); // save 7th byte
                this.a <<= 1;
                this.a = (this.a | ((this.flagsC)))&0xff; // byte1=carry

                if (seventh != 0)
                {
                    // set carry
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x2C:
            {
                // BIT absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var bitz = this.mmu.readAddr(operand);
                var tzt = (this.a & bitz);

                // 11100101 right

                this.flagsN = ((bitz & 0x80) != 0) ? 1 : 0;
                this.flagsV = ((bitz & 0x40) != 0) ? 1 : 0;
                this.flagsZ = ((bitz & this.a) == 0) ? 1 : 0;

                break;
            }
            case 0x2D:
            {
                // AND absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr(operand);
                this.a&=iop;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x2E:
            {
                // ROL absolute
                var operand=this.mmu.readAddr16bit(this.pc+1);
                var opz = this.mmu.readAddr(operand);
                var seventh = ((opz >> 7) & 0x01); // save 7th byte
                opz <<= 1;
                opz = (opz | ((this.flagsC)))&0xff; // byte1=carry
                if (seventh != 0)
                {
                    // set carry
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.mmu.writeAddr(operand, opz);
                this.doFlagsNZ(opz);
                break;
            }        
            case 0x30:
            {
                // BMI offset
                if (this.flagsN==1)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr(this.pc+1);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0x31:
            {
                // AND (indirect),Y
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.readAddr16bit(operand);
                var finval=this.mmu.readAddr((indi+this.y)&0xffff);
                this.a&=finval;
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(indi,this.y);
                break;
            }
            case 0x35:
            {
                // AND zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var opz = this.mmu.readAddr((operand+this.x)&0xff);
                this.a&=opz;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x36:
            {
                // ROL zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var opz = this.mmu.readAddr((operand+this.x)&0xff);
                var seventh = ((opz >> 7) & 0x01); // save 7th byte
                opz <<= 1;
                opz = (opz | ((this.flagsC)))&0xff; // byte1=carry
                if (seventh != 0)
                {
                    // set carry
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.mmu.writeAddr((operand+this.x)&0xff, opz);
                this.doFlagsNZ(opz);
                break;
            }
            case 0x38:
            {
                // SEC
                this.flagsC=1;
                break;
            }
            case 0x39:
            {
                // AND absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var addressToRead=(operand+this.y)&0xffff;
                this.a&=this.mmu.readAddr(addressToRead);
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0x3c:
            {
                // NOP undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0x3d:
            {
                // AND absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var addressToRead=(operand+this.x)&0xffff;
                this.a&=this.mmu.readAddr(addressToRead);
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0x3E:
            {
                // ROL absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var opz = this.mmu.readAddr((operand+this.x)&0xffff);
                var seventh = ((opz >> 7) & 0x01); // save 7th byte
                opz <<= 1;
                opz = (opz | ((this.flagsC)))&0xff; // byte1=carry
                if (seventh != 0)
                {
                    // set carry
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.mmu.writeAddr((operand+this.x)&0xffff, opz);
                this.doFlagsNZ(opz);
                break;
            }        
            case 0x40:
            {
                // RTI
                //console.log("CPU::Warning: RTI");
                
                this.sp++;
                if (this.sp>0xff) this.sp=0;
                var preg = this.mmu.readAddr(0x100|this.sp);
                this.flagsN=(preg&0x80)?1:0;
                this.flagsV=(preg&0x40)?1:0;
                //this.flagsB=(preg&0x10)?1:0;
                this.flagsD=(preg&0x08)?1:0;
                this.flagsI=(preg&0x04)?1:0;
                this.flagsZ=(preg&0x02)?1:0;
                this.flagsC=(preg&0x01)?1:0;

                var pclo;
                var pchi;

                this.sp++;
                if (this.sp>0xff) this.sp=0;
                pclo= this.mmu.readAddr(0x100|this.sp);
                this.sp++;
                if (this.sp>0xff) this.sp=0;
                pchi = this.mmu.readAddr(0x100|this.sp);

                this.pc = (pclo) | (pchi << 8);
                
                elapsedCycles+= 6;
                jumped=true;
                break;
            }
            case 0x41:
            {
                // EOR (indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi=this.mmu.getWrappedAddr((operand+this.x)&0xff);
                var opz = this.mmu.readAddr(indi);
                this.a^=opz;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x44:
            {
                // NOP undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0x45:
            {
                // EOR zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var opz = this.mmu.readAddr(operand);
                this.a^=opz;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x46:
            {
                // LSR zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var theb = this.mmu.readAddr(operand);
                if ((theb & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                theb >>= 1;
                theb &= 0x7f;

                this.mmu.writeAddr(operand,theb);

                this.doFlagsNZ(theb);
                break;
            }
            case 0x48:
            {
                // PHA
                this.mmu.writeAddr(0x100 | this.sp, this.a);
                this.sp--;
                if (this.sp<0) this.sp=0xff;
                break;
            }
            case 0x49:
            {
                // EOR immediate
                var operand=this.mmu.readAddr(this.pc+1);
                this.a^=operand;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x4A:
            {
                // LSR (shift register a right)
                var theb = this.a;
                if ((theb & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                theb >>= 1;
                theb &= 0x7f;

                this.a = theb;

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x4B:
            {
                // ALR immediate undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                this.a&=operand;

                if ((this.a & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                this.a >>= 1;
                this.a &= 0x7f;

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x4C:
            {
                // JMP absolute
                var jumpAddress=this.mmu.readAddr16bit(this.pc+1);
                this.pc=jumpAddress;
                jumped=true;
                break;
            }
            case 0x4D:
            {
                // EOR absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr(operand);
                this.a^=iop;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x4E:
            {
                // LSR absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var theb = this.mmu.readAddr(operand);
                if ((theb & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                theb >>= 1;
                theb &= 0x7f;

                this.mmu.writeAddr(operand,theb);

                this.doFlagsNZ(theb);
                break;
            }
            case 0x50:
            {
                // BVC offset
                if (this.flagsV==0)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0x51:
            {
                // EOR (indirect),Y
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.readAddr16bit(operand);
                var finval=this.mmu.readAddr((indi+this.y)&0xffff);
                this.a^=finval;
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(indi,this.y);
                break;
            }
            case 0x55:
            {
                // EOR zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var opz = this.mmu.readAddr((operand+this.x)&0xff);
                this.a^=opz;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x56:
            {
                // LSR (logical shift right)
                var operand=this.mmu.readAddr(this.pc+1);
                var theb = this.mmu.readAddr((operand+this.x)&0xff);

                if ((theb & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                theb >>= 1;
                theb &= 0x7f;

                this.mmu.writeAddr((operand+this.x)&0xff,theb);
                this.doFlagsNZ(theb);
                break;
            }
            case 0x58:
            {
                // CLI
                this.flagsI=0;
                break;
            }
            case 0x59:
            {
                // EOR absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr((operand+this.y)&0xffff);
                this.a^=iop;
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0x5A:
            {
                // NOP undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0x5D:
            {
                // EOR absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr((operand+this.x)&0xffff);
                this.a^=iop;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x5E:
            {
                // LSR absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var theb = this.mmu.readAddr((operand+this.x)&0xffff);
                if ((theb & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                theb >>= 1;
                theb &= 0x7f;

                this.mmu.writeAddr((operand+this.x)&0xffff,theb);

                this.doFlagsNZ(theb);
                break;
            }
            case 0x5F:
            {
                // SRE absolute,X undocumented FIXXX
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var origByte = this.mmu.readAddr(operand+this.x);
                var theb=origByte;
                if ((theb & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                theb >>= 1;
                theb &= 0x7f;

                this.mmu.writeAddr(operand+this.x,theb);

                this.a^=origByte;

                this.doFlagsNZ(this.a);
                break;
            }
            case 0x60:
            {
                // RTS
                var pch = this.mmu.readAddr(0x100|((this.sp + 2)&0xff));
                var pcl = this.mmu.readAddr(0x100|((this.sp + 1)&0xff));
                var addr = pcl | (pch << 8);

                this.pc = addr+1;
                
                this.sp += 2;
                if (this.sp>0xff) this.sp&=0xff;

                jumped=true;
                break;
            }
            case 0x61:
            {
                // ADC (indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi=this.mmu.getWrappedAddr((operand+this.x)&0xff);
                var zpval=this.mmu.readAddr(indi);
                this.doAdc(zpval);
                break;
            }
            case 0x65:
            {
                // ADC zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var zpval=this.mmu.readAddr(operand);
                this.doAdc(zpval);
                break;
            }
            case 0x66:
            {
                // ROR zeropage
                var operand=this.mmu.readAddr(this.pc+1);

                var bitz = this.mmu.readAddr(operand);
                var carryset = false;

                // save carry
                if (this.flagsC)
                {
                    carryset = true;
                }

                if ((bitz & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                bitz >>= 1;
                if (carryset) bitz |= 0x80;
                this.mmu.writeAddr(operand,bitz);

                this.doFlagsNZ(bitz);
                break;
            }
            case 0x68:
            {
                // PLA
                this.sp++;
                if (this.sp>0xff) this.sp=0;
                this.a = this.mmu.readAddr(0x100 | this.sp);
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x69:
            {
                // ADC immediate
                var operand=this.mmu.readAddr(this.pc+1);
                this.doAdc(operand);
                break;
            }
            case 0x6A:
            {
                // ROR accumulator
                var bitz = this.a;
                var carryset = false;

                // save carry
                if (this.flagsC)
                {
                    carryset = true;
                }

                if ((bitz & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                bitz >>= 1;
                if (carryset) bitz |= 0x80;
                this.a=bitz;
                this.doFlagsNZ(bitz);
                break;
            }
            case 0x6C:
            {
                // JMP Indirect
                var operand=this.mmu.readAddr16bit(this.pc+1);
                var realAddress;
                
                if ((operand&0xff)==0xff)
                {
                    var lsb=this.mmu.readAddr(operand);
                    var msb=this.mmu.readAddr(operand&0xff00);
                    realAddress=lsb|(msb<<8);
                }
                else
                {
                    realAddress=this.mmu.readAddr16bit(operand);
                }
                
                this.pc=realAddress;
                jumped=true;
                break;
            }
            case 0x6D:
            {
                // ADC absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr(operand);
                this.doAdc(iop);
                break;
            }
            case 0x6E:
            {
                // ROR absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;

                var bitz = this.mmu.readAddr(operand);
                var carryset = false;

                // save carry
                if (this.flagsC)
                {
                    carryset = true;
                }

                if ((bitz & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                bitz >>= 1;
                if (carryset) bitz |= 0x80;
                this.mmu.writeAddr(operand,bitz);

                this.doFlagsNZ(bitz);
                break;
            }
            case 0x70:
            {
                // BVS offset
                if (this.flagsV==1)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0x71:
            {
                // ADC (indirect),Y
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.readAddr16bit(operand);
                var finval=this.mmu.readAddr((indi+this.y)&0xffff);
                this.doAdc(finval);
                elapsedCycles+=this.pageCross(indi,this.y);
                break;
            }
            case 0x75:
            {
                // ADC zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var op2=this.mmu.readAddr((operand+this.x)&0xff);
                this.doAdc(op2);
                break;
            }
            case 0x76:
            {
                // ROR zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var bitz=this.mmu.readAddr((operand+this.x)&0xff);

                var carryset = false;

                // save carry
                if (this.flagsC)
                {
                    carryset = true;
                }

                if ((bitz & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                bitz >>= 1;
                if (carryset) bitz |= 0x80;
                this.mmu.writeAddr((operand+this.x)&0xff,bitz);

                this.doFlagsNZ(bitz);
                break;
            }
            case 0x78:
            {
                // SEI
                this.flagsI=1;
                break;
            }
            case 0x79:
            {
                // ADC absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr((operand+this.y)&0xffff);
                this.doAdc(iop);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0x7D:
            {
                // ADC absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr((operand+this.x)&0xffff);
                this.doAdc(iop);
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0x7E:
            {
                // ROR absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var addressToRead=(operand+this.x)&0xffff;
                var bitz=this.mmu.readAddr(addressToRead);

                var carryset = false;

                // save carry
                if (this.flagsC)
                {
                    carryset = true;
                }

                if ((bitz & 0x01)!=0)
                {
                    this.flagsC=1;
                }
                else
                {
                    this.flagsC=0;
                }

                bitz >>= 1;
                if (carryset) bitz |= 0x80;
                this.mmu.writeAddr((operand+this.x)&0xffff,bitz);

                this.doFlagsNZ(bitz);
                break;
            }
            case 0x80:
            {
                // SKB undocumented
                //console.log("Undoc opcode");
                this.pc+=1;
                break;
            }
            case 0x81:
            {
                // STA (indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi=this.mmu.getWrappedAddr((operand+this.x)&0xff);
                this.mmu.writeAddr(indi,this.a);
                break;
            }
            case 0x82:
            {
                // NOP undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0x84:
            {
                // STY zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr(operand,this.y);
                break;
            }
            case 0x85:
            {
                // STA zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr(operand,this.a);
                break;
            }
            case 0x86:
            {
                // STX zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr(operand,this.x);
                break;
            }
            case 0x87:
            {
                // SAX zeropage undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr(operand,this.a&this.x);
                break;
            }
            case 0x88:
            {
                // DEY
                this.y-=1;
                if (this.y<0) this.y=0xff;
                this.doFlagsNZ(this.y);
                break;
            }
            case 0x8A:
            {
                // TXA
                this.a=this.x;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x8C:
            {
                // STY absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.mmu.writeAddr(operand,this.y);
                break;
            }
            case 0x8d:
            {
                // STA absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.mmu.writeAddr(operand,this.a);
                break;
            }
            case 0x8e:
            {
                // STX Operand Absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.mmu.writeAddr(operand,this.x);
                break;
            }
            case 0x90:
            {
                // BCC offset
                if (this.flagsC==0)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));
                    
                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0x91:
            {
                // STA (indirect),Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var indi = this.mmu.readAddr16bit(operand);
                this.mmu.writeAddr((indi+this.y)&0xffff,this.a);
                break;
            }
            case 0x94:
            {
                // STY zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr((operand+this.x)&0xff,this.y);
                break;
            }
            case 0x95:
            {
                // STA zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr((operand+this.x)&0xff,this.a);
                break;
            }
            case 0x96:
            {
                // STX zeropage,Y
                var operand=this.mmu.readAddr(this.pc+1);
                this.mmu.writeAddr((operand+this.y)&0xff,this.x);
                break;
            }
            case 0x98:
            {
                // TYA
                this.a=this.y;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0x99:
            {
                // STA absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.mmu.writeAddr((operand+this.y)&0xffff,this.a);
                break;
            }
            case 0x9A:
            {
                // TXS
                this.sp=this.x;
                break;
            }
            case 0x9D:
            {
                // STA absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.mmu.writeAddr((operand+this.x)&0xffff,this.a);
                break;
            }
            case 0xa0:
            {
                // LDY immediate
                this.y=this.mmu.readAddr(this.pc+1);
                this.doFlagsNZ(this.y);
                break;
            }
            case 0xa1:
            {
                // LDA (indirect,X)
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var indi=this.mmu.getWrappedAddr((operand+this.x)&0xff);
                this.a=this.mmu.readAddr(indi);
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xa4:
            {
                // LDY zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                this.y=this.mmu.readAddr(operand);
                this.doFlagsNZ(this.y);
                break;
            }
            case 0xa9:
            {
                // LDA immediate
                this.a=this.mmu.readAddr((this.pc+1)&0xffff);
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xA2:
            {
                // LDX immediate
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                this.x=operand;
                this.doFlagsNZ(operand);
                break;
            }
            case 0xA5:
            {
                // LDA operand zero page
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                this.a=this.mmu.readAddr(operand);
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xA6:
            {
                // LDX zeropage
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var zpval=this.mmu.readAddr(operand);
                this.x=zpval;
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xA7:
            {
                // LAX zeropage undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var zpval=this.mmu.readAddr(operand);
                this.a=zpval;
                this.x=zpval;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xA8:
            {
                // TAY
                this.y=this.a;
                this.doFlagsNZ(this.y);
                break;
            }
            case 0xAA:
            {
                // TAX
                this.x=this.a;
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xAC:
            {
                // LDY absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.y=this.mmu.readAddr(operand);
                this.doFlagsNZ(this.y);
                break;
            }
            case 0xAD:
            {
                // LDA absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.a=this.mmu.readAddr(operand);
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xAE:
            {
                // LDX absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                this.x=this.mmu.readAddr(operand);
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xAF:
            {
                // LAX absolute undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var laxval=this.mmu.readAddr(operand);
                this.a=laxval;
                this.x=laxval;
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xb0:
            {
                // BCS offset
                if (this.flagsC==1)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0xb1:
            {
                // LDA (operand),Y
                var operand=this.mmu.readAddr(this.pc+1);
                var address=this.mmu.readAddr16bit(operand);
                var finalAddress=(address+this.y)&0xffff;
                this.a=this.mmu.readAddr(finalAddress);
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(address,this.y);
                break;
            }
            case 0xb3:
            {
                // LAX (ZeroPage),Y undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.readAddr16bit(operand);
                var finval=this.mmu.readAddr((indi+this.y)&0xffff);
                this.a=finval;
                this.x=finval;
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(indi,this.y);
                break;
            }
            case 0xb4:
            {
                // LDY ZeroPage,X
                var operand=this.mmu.readAddr(this.pc+1);
                this.y = this.mmu.readAddr((operand + this.x)&0xff);
                this.doFlagsNZ(this.y);
                break;
            }
            case 0xb5:
            {
                // LDA ZeroPage,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                this.a = this.mmu.readAddr((operand + this.x)&0xff);
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xB6:
            {
                // LDX zeropage,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                this.x = this.mmu.readAddr((operand + this.y)&0xff);
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xB7:
            {
                // LAX zeropage,y undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var zpval=this.mmu.readAddr((operand + this.y)&0xff);
                
                this.a=zpval;
                this.x=zpval;
                
                this.doFlagsNZ(this.a);
                break;
            }
            case 0xb8:
            {
                // CLV
                this.flagsV=0;
                break;
            }
            case 0xb9:
            {
                // LDA absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var val=this.mmu.readAddr((operand+this.y)&0xffff);
                this.a = val;
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0xba:
            {
                // TSX
                this.x=this.sp;
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xbc:
            {
                // LDY absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var addressToRead=(operand+this.x)&0xffff;
                this.y=this.mmu.readAddr(addressToRead);
                this.doFlagsNZ(this.y);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0xbd:
            {
                // LDA absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var addressToRead=(operand+this.x)&0xffff;
                this.a=this.mmu.readAddr(addressToRead);
                this.doFlagsNZ(this.a);
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0xbe:
            {
                // LDX absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var addr = (operand + this.y)&0xffff;
                var memr = this.mmu.readAddr(addr);
                this.x = memr;
                this.doFlagsNZ(this.x);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0xC0:
            {
                // CPY immediate
                var mem=this.mmu.readAddr(this.pc+1);
                if (this.y>=mem) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.y-mem);
                break;
            }
            case 0xC1:
            {
                // CMP (Indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.getWrappedAddr((operand + this.x) & 0xff);
                var iop = this.mmu.readAddr(indi);

                if (this.a>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-iop);
                break;
            }
            case 0xC3:
            {
                // DCP zeropage,x undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.readAddr16bit((operand + this.x) & 0xff);
                var mval=this.mmu.readAddr(indi);
                mval-=1;
                if (mval<0) mval=0xff;

                this.mmu.writeAddr(indi,mval);

                if (this.a>=mval) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-mval);

                break;
            }
            case 0xC4:
            {
                // CPY Zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr(operand);
                if (this.y>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.y-iop);
                break;
            }
            case 0xCE:
            {
                // DEC absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var theb=this.mmu.readAddr(operand);
                theb--;
                if (theb<0) theb=0xff;

                this.mmu.writeAddr(operand,theb);
                this.doFlagsNZ(theb);
                break;
            }
            case 0xC5:
            {
                // CMP zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var mem=this.mmu.readAddr(operand);
                if (this.a>=mem) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-mem);
                break;
            }
            case 0xC6:
            {
                // DEC zeropage
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var mval=this.mmu.readAddr(operand);
                mval-=1;
                if (mval<0) mval=0xff;
                this.mmu.writeAddr(operand,mval);
                this.doFlagsNZ(mval);
                break;
            }
            case 0xC7:
            {
                // DCP zeropage undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var mval=this.mmu.readAddr(operand);
                mval-=1;
                if (mval<0) mval=0xff;
                this.mmu.writeAddr(operand,mval);

                if (this.a>=mval) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-mval);

                break;
            }
            case 0xC8:
            {
                // INY
                this.y+=1;
                if (this.y>0xff) this.y=0;
                this.doFlagsNZ(this.y);
                break;
            }
            case 0xC9:
            {
                // CMP immediate
                var operand=this.mmu.readAddr(this.pc+1);
                if (this.a>=operand) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-operand);
                break;
            }
            case 0xCA:
            {
                // DEX
                this.x-=1;
                if (this.x<0) this.x=0xff;
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xCB:
            {
                // ASX or SBX, undocumented, X = A & X - #{imm}
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                
                const tmp = (this.a & this.x) - operand;

                this.x = tmp & 0xff;
                this.flagsC = (tmp >= 0) ? 1 : 0;
                
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xCC:
            {
                // CPY absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var mem=this.mmu.readAddr(operand);
                if (this.y>=mem) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.y-mem);
                break;
            }
            case 0xCD:
            {
                // CMP absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr(operand);
                if (this.a>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-iop);
                break;
            }
            case 0xD0:
            {
                // BNE offset
                if (this.flagsZ==0)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                    var branchAmount=this.calcRelativeBranch(operand);

                    if (branchAmount!=0)
                    {
                        var newaddr = this.pc + 2 + branchAmount;
                        elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                        this.pc+=branchAmount+2;
                        this.pc&=0xffff;
                        jumped=true;
                    }
                }
                break;
            }
            case 0xD1:
            {
                // CMP (indirect),Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var indi = this.mmu.readAddr16bit(operand);
                var finval=this.mmu.readAddr((indi+this.y)&0xffff);

                if (this.a>=finval) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-finval);
                elapsedCycles+=this.pageCross(indi,this.y);
                break;
            }
            case 0xD4:
            {
                // NOP zeropage,X undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                var opz=this.mmu.readAddr((operand+this.x)&0xff);
                break;
            }
            case 0xD5:
            {
                // CMP zeropage,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                var opz=this.mmu.readAddr((operand+this.x)&0xff);
                if (this.a>=opz) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-opz);
                break;
            }
            case 0xD6:
            {
                // DEC zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var mval=this.mmu.readAddr((operand+this.x)&0xff);
                mval-=1;
                if (mval<0) mval=0xff;
                this.mmu.writeAddr((operand+this.x)&0xff,mval);
                this.doFlagsNZ(mval);
                break;
            }
            case 0xD8:
            {
                // CLD
                this.flagsD=0;
                break;
            }
            case 0xD9:
            {
                // CMP absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr((operand+this.y)&0xffff);
                if (this.a>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-iop);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0xDD:
            {
                // CMP absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop=this.mmu.readAddr((operand+this.x)&0xffff);
                if (this.a>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.a-iop);
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0xDE:
            {
                // DEC absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var theb=this.mmu.readAddr((operand+this.x)&0xffff);
                theb--;
                if (theb<0) theb=0xff;

                this.mmu.writeAddr((operand+this.x)&0xffff,theb);
                this.doFlagsNZ(theb);
                break;
            }
            case 0xE0:
            {
                // CPX immediate
                var operand=this.mmu.readAddr(this.pc+1);
                if (this.x>=operand) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.x-operand);
                break;
            }
            case 0xE1:
            {
                // SBC (indirect,X)
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.getWrappedAddr((operand + this.x) & 0xff);
                var iop = this.mmu.readAddr(indi);
                this.doSbc(iop);
                break;
            }
            case 0xE4:
            {
                // CPX Zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr(operand);
                if (this.x>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.x-iop);
                break;
            }
            case 0xE5:
            {
                // SBC Zeropage
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr(operand);
                this.doSbc(iop);
                break;
            }
            case 0xE6:
            {
                // INC memory (zeropage)
                var operand=this.mmu.readAddr(this.pc+1);
                var curval=this.mmu.readAddr(operand);
                curval+=1;
                if (curval>0xff) curval=0;
                this.mmu.writeAddr(operand,curval);
                this.doFlagsNZ(curval);
                break;
            }
            case 0xE8:
            {
                // INX
                this.x+=1;
                if (this.x>0xff) this.x=0;
                this.doFlagsNZ(this.x);
                break;
            }
            case 0xe9:
            {
                // SBC immediate
                var operand=this.mmu.readAddr(this.pc+1);
                this.doSbc(operand);
                break;
            }
            case 0xEA:
            {
                // NOP
                break;
            }
            case 0xeb:
            {
                // SBC immediate undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr(this.pc+1);
                this.doSbc(operand);
                break;
            }
            case 0xEC:
            {
                // CPX absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr(operand);

                if (this.x>=iop) this.flagsC=1;
                else this.flagsC=0;
                this.doFlagsNZ(this.x-iop);
                break;
            }
            case 0xED:
            {
                // SBC absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr(operand);
                this.doSbc(iop);
                break;
            }
            case 0xEE:
            {
                // INC absolute
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var curval=this.mmu.readAddr(operand);
                curval+=1;
                if (curval>0xff) curval=0;
                this.mmu.writeAddr(operand,curval);
                this.doFlagsNZ(curval);
                break;
            }
            case 0xF0:
            {
                // BEQ
                if (this.flagsZ==1)
                {
                    var oldPc=this.pc;
                    var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                    var branchAmount=this.calcRelativeBranch(operand);

                    var newaddr = this.pc + 2 + branchAmount;
                    elapsedCycles += (1 + this.calcPagecrossPenalty2(newaddr,oldPc));

                    this.pc+=branchAmount+2;
                    this.pc&=0xffff;
                    jumped=true;
                }
                break;
            }
            case 0xF1:
            {
                // SBC (indirect),Y
                var operand=this.mmu.readAddr(this.pc+1);
                var indi = this.mmu.readAddr16bit(operand);
                var finval=this.mmu.readAddr((indi+this.y)&0xffff);
                this.doSbc(finval);
                elapsedCycles+=this.pageCross(indi,this.y);
                break;
            }
            case 0xf5:
            {
                // SBC Zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var iop = this.mmu.readAddr((operand+this.x)&0xff);
                this.doSbc(iop);
                break;
            }
            case 0xF6:
            {
                // INC memory zeropage,X
                var operand=this.mmu.readAddr(this.pc+1);
                var curval=this.mmu.readAddr((operand+this.x)&0xff);
                curval+=1;
                if (curval>0xff) curval=0;
                this.mmu.writeAddr((operand+this.x)&0xff,curval);
                this.doFlagsNZ(curval);
                break;
            }
            case 0xf8:
            {
                // SED
                this.flagsD=1;
                break;
            }
            case 0xF9:
            {
                // SBC absolute,Y
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr((operand+this.y)&0xffff);
                this.doSbc(iop);
                elapsedCycles+=this.pageCross(operand,this.y);
                break;
            }
            case 0xFA:
            {
                // NOP undocumented
                //console.log("Undoc opcode");
                break;
            }
            case 0xFC:
            {
                // NOP abs, x undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr16bit(this.pc+1);
                break;
            }
            case 0xFD:
            {
                // SBC absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var iop = this.mmu.readAddr((operand+this.x)&0xffff);
                this.doSbc(iop);
                elapsedCycles+=this.pageCross(operand,this.x);
                break;
            }
            case 0xFE:
            {
                // INC absolute,X
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var curval=this.mmu.readAddr((operand+this.x)&0xffff);
                curval+=1;
                if (curval>0xff) curval=0;
                this.mmu.writeAddr((operand+this.x)&0xffff,curval);
                this.doFlagsNZ(curval);
                break;
            }
            case 0xFF:
            {
                // ISC absolute,X undocumented
                //console.log("Undoc opcode");
                var operand=this.mmu.readAddr((this.pc+1)&0xffff);
                operand|=this.mmu.readAddr((this.pc+2)&0xffff)<<8;
                var curval=this.mmu.readAddr(operand+this.x);
                curval+=1;
                if (curval>0xff) curval=0;
                this.mmu.writeAddr(operand+this.x,curval);
                this.doSbc(curval);
                this.doFlagsNZ(curval);
                break;
            }
            default:
            {
                // unknown instruction
                alert("Error: unknown instruction ["+nextOpcode.toString(16)+"] at ["+this.pc.toString(16)+"]");
            }
        }

        if ((this.x==undefined)||(this.y==undefined)||(this.a==undefined)||(this.pc==undefined)||(this.sp==undefined))
        {
            console.log("CPU 6510: x,y,a,pc or sp undefined "+this.x+" "+this.y+" "+this.a+" "+this.pc+" "+this.sp);
        }

        if (!jumped) this.pc+=this.instructionTable[nextOpcode][0];

        this.totCycles+=elapsedCycles;
        this.totCycles+=this.instructionTable[nextOpcode][1];
        elapsedCycles+=this.instructionTable[nextOpcode][1];

        if ((this.a>0xff)||(this.a<0)) alert("Warning: a out of bounds ["+this.a.toString(16)+"] at "+this.pc.toString(16));
        if ((this.x>0xff)||(this.x<0)) alert("Warning: x out of bounds at "+this.pc.toString(16));
        if ((this.y>0xff)||(this.y<0)) alert("Warning: y out of bounds at "+this.pc.toString(16));
        if ((this.sp>0xff)||(this.sp<0)) alert("Warning: sp out of bounds at "+this.pc.toString(16));
        if ((this.pc>0xffff)||(this.pc<0)) alert("Warning: pc out of bounds at "+this.pc.toString(16));

        //this.traceLog();

        return elapsedCycles;
    }

    debugOpcodes(numOpcodes,disassembledList)
    {
        if (!this.CPUstarted) return;

        var baseAddr=this.pc;

        for (var nOps=0;nOps<numOpcodes;nOps++)
        {
            if ((baseAddr>=0)&&(baseAddr<=0xffff))
            {
                var nextOpcode=this.mmu.readAddr(baseAddr);
                //console.log("Fetched opcode "+nextOpcode.toString(16));

                var dis=this.instructionTable[nextOpcode];
                if (dis[0]==1) 
                {
                    disassembledList.push([baseAddr,dis[2],[nextOpcode]]);
                }
                else if (dis[0]==2)
                {
                    var operand=this.mmu.readAddr(baseAddr+1);
                    disassembledList.push([baseAddr,dis[2].replace("%d",operand.toString(16)),[nextOpcode,operand]]);
                }
                else if (dis[0]==3)
                {
                    var operand=this.mmu.readAddr16bit(baseAddr+1);
                    disassembledList.push([baseAddr,dis[2].replace("%d",operand.toString(16)),[nextOpcode,operand]]);
                }

                baseAddr+=this.instructionTable[nextOpcode][0];
            }
        }
    }
}
