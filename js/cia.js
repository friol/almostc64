/* or we'll call the CIA */

class cia
{
    constructor(id)
    {
        this.ciaId=id;

        this.icr1=0;
        this.sdr=0;

        this.viaptr=undefined;

        this.ciatod=new tod();
        
        this.irqControlReg_dc0d=0;
        this.dataPortA=0;
        this.ciaportB=0;

        this.timerAlatch=0;
        this.timerA_dc04=0;
        this.timerA_dc05=0;
        this.timerACtrl_dc0e=0;
        this.timerAisRunning=false;

        this.timerBlatch=0;
        this.timerB_dc06=0;
        this.timerB_dc07=0;
        this.timerBCtrl_dc0f=0;
        this.timerBisRunning=false;

        this.datadirregA=0;
        this.datadirregB=0;
        this.controlReg2=0;

        this.curJoystick=1;

        this.keyboardKeyList=[];

        /*
        keyboard matrix (has you):
         
        STOP    Q       C=      SPACE   2       CTRL    <-      1
        /       ^       =       RSHIFT  HOME    ;       *       LIRA
        ,       @       :       .       -       L       P       +
        N       O       K       M       0       J       I       9
        V       U       H       B       8       G       Y       7
        X       T       F       C       6       D       R       5
        LSHIFT  E       S       Z       4       A       W       3
        CRSR DN F5      F3      F1      F7      CRSR RT RETURN  DELETE
        */

        this.keyDefArray =
        [
            "Escape", "q", "PageUp", " ", "2", "Ctrl", "arrow", "1",
            "/","^", "=","rs","Home",";","*","INS",
            ",","@",":",".","-","l","p","+",
            "n","o","k","m","0","j","i","9",
            "v","u","h","b","8","g","y","7",
            "x","t","f","c","6","d","r","5",
            "Shift","e","s","z","4","a","w","3",
            "Pause","F5","F3","F1","F7","eee","Enter","Backspace"
        ];        
    }

    linkCpu(c)
    {
        this.cCpu=c;
    }

    linkVia(v)
    {
        this.viaptr=v;
    }

    keyPress(kv)
    {
        if (this.keyboardKeyList.indexOf(kv)<0)
        {
            this.keyboardKeyList.push(kv);
        }
    }

    keyUp(kv)
    {
        const index = this.keyboardKeyList.indexOf(kv);
        if (index > -1) 
        {
            this.keyboardKeyList.splice(index, 1);
        }
    }

    buildKeypressByte()
    {
        var retByte = (~this.datadirregB)&0xff; 
        var tst = ((this.dataPortA | (~this.datadirregA)) )&0xff;

        for (var curk=0;curk<this.keyboardKeyList.length;curk++)
        {
            var k = this.keyboardKeyList[curk];
            var pos=0;

            for (var i=0;i<this.keyDefArray.length;i++)
            {
                if (k == this.keyDefArray[i])
                {
                    var keycol = pos % 8;
                    var keyrow = Math.floor(pos / 8);

                    if ((tst & (1<<(7-keyrow))) == 0)
                    {
                        retByte&=(~(1<<(7-keycol)))&0xff;
                    }
                }
                pos++;
            }
        }

        // joystick 1
        if (this.curJoystick==1)
        {
            for (var curk=0;curk<this.keyboardKeyList.length;curk++)
            {
                if (this.keyboardKeyList[curk] == "Control")
                {
                    retByte &= 0xEF;
                }
                else if (this.keyboardKeyList[curk]=="ArrowLeft")
                {
                    retByte &= 0xfb;
                }
                else if (this.keyboardKeyList[curk]=="ArrowRight")
                {
                    retByte &= 0xf7;
                }
                else if (this.keyboardKeyList[curk]=="ArrowUp")
                {
                    retByte &= 0xfe;
                }
                else if (this.keyboardKeyList[curk]=="ArrowDown")
                {
                    retByte &= 0xfd;
                }
            }
        }

        return retByte;
        //return (retByte|(this.ciaportB&this.datadirregB))&0xff;
        //return (byte)((ret | (prb & ddrb)) & Joystick1);
    }

    buildCia1PortAByte()
    {
        var retByte = ((this.dataPortA | (~this.datadirregA)))&0xff;
        var tst = (this.ciaportB|(~this.datadirregB))&0xff; 

        for (var curk=0;curk<this.keyboardKeyList.length;curk++)
        {
            var k = this.keyboardKeyList[curk];
            var pos=0;

            for (var i=0;i<this.keyDefArray.length;i++)
            {
                if (k == this.keyDefArray[i])
                {
                    var keycol = pos % 8;
                    var keyrow = Math.floor(pos / 8);

                    if ((tst & (1<<(7-keycol))) == 0)
                    {
                        retByte&=(~(1<<(7-keyrow)))&0xff;
                    }
                }
                pos++;
            }
        }        

        if (this.curJoystick==2)
        {
            for (var curk=0;curk<this.keyboardKeyList.length;curk++)
            {
                if (this.keyboardKeyList[curk] == "Control")
                {
                    retByte &= 0xEF;
                }
                else if (this.keyboardKeyList[curk]=="ArrowLeft")
                {
                    retByte &= 0xfb;
                }
                else if (this.keyboardKeyList[curk]=="ArrowRight")
                {
                    retByte &= 0xf7;
                }
                else if (this.keyboardKeyList[curk]=="ArrowUp")
                {
                    retByte &= 0xfe;
                }
                else if (this.keyboardKeyList[curk]=="ArrowDown")
                {
                    retByte &= 0xfd;
                }
            }
        }
        
        return retByte;
    }

    update(elapsedCycles,theCpu)
    {
        var timerAunderflow=false;

        this.ciatod.update(elapsedCycles);

        if (this.timerAisRunning)
        {
            var timerLow = this.timerA_dc04;
            var timerHigh = this.timerA_dc05;
            var timerVal = timerLow | (timerHigh << 8);

            timerVal -= elapsedCycles;
            if (timerVal <= 0)
            {
                timerAunderflow=true;

                this.icr1 |= 0x01;
                if ((this.irqControlReg_dc0d & 0x01) == 0x01)
                {
                    // trigger irq
                    if (this.ciaId==1) theCpu.ciaIrqPending=true;
                    if (this.ciaId==2) theCpu.nmiPending=true;
                    this.icr1 |= 0x80;
                }

                // always reload
                this.timerA_dc04 = (this.timerAlatch & 0xff);
                this.timerA_dc05 = ((this.timerAlatch>>8) & 0xff);

                // must be retriggered?
                if ((this.timerACtrl_dc0e & 0x08) != 0)
                {
                    this.timerAisRunning = false;
                    this.timerACtrl_dc0e&=0xfe; // FIXXX?
                }
            }
            else
            {
                this.timerA_dc04 = (timerVal & 0xff);
                this.timerA_dc05 = ((timerVal >> 8) & 0xff);
            }
        }

        //

        if (this.timerBisRunning)
        {
            var timerLow = this.timerB_dc06;
            var timerHigh = this.timerB_dc07;
            var timerVal = timerLow | (timerHigh << 8);

            if (((this.controlReg2&0x60)>>5)==0)
            {
                timerVal -= elapsedCycles;
            }
            else if (((this.controlReg2&0x60)>>5)==2)
            {
                // watch if timer A underflowed
                if (timerAunderflow)
                {
                    timerVal--;
                }
            }
            else
            {
                // handle other cases TODO
            }

            if (timerVal <= 0)
            {
                this.icr1 |= 0x02;
                if ((this.irqControlReg_dc0d & 0x02) == 0x02)
                {
                    if (this.ciaId==1) theCpu.ciaIrqPending=true;
                    if (this.ciaId==2) theCpu.nmiPending=true;
                    this.icr1 |= 0x80;
                }

                // allways reload
                this.timerB_dc06 = (this.timerBlatch & 0xff)&0xff;
                this.timerB_dc07 = ((this.timerBlatch >> 8) & 0xff);

                // must be retriggered?
                if ((this.timerBCtrl_dc0f & 0x08) != 0)
                {
                    this.timerBisRunning = false;
                    this.timerBCtrl_dc0f&=0xfe; // FIXXX?
                }
            }
            else
            {
                this.timerB_dc06 = (timerVal & 0xff);
                this.timerB_dc07 = ((timerVal >> 8) & 0xff);
            }
        }
    }

    cia2getVICbank()
    {
        return 3-(~(this.dataPortA | (~this.datadirregA)) & 0x03);
    }

    readCIARegister(addr)
    {
        if (this.ciaId==1) addr = (addr%0x10) | 0xdc00;
        if (this.ciaId==2) addr = (addr%0x10) | 0xdd00;

        if (addr==0xdc00)
        {
            return this.buildCia1PortAByte();
        }
        else if (addr==0xdd00)
        {
            /*const via1out=this.viaptr.readVIARegister(0x1800);
            const dataout=(via1out>>1)&1;
            const clockout=(via1out>>3)&1;
            const serialBits=(dataout<<7)|(clockout<<6);
			return (serialBits&0xc0)|((this.dataPortA | (~this.datadirregA))&0x3f);*/

            //return (this.viaptr.readSerialBus()&0xfc)
            //|((this.dataPortA | (~this.datadirregA))&0x03);

            const serialData=this.viaptr.serialData;
            const serialClock=this.viaptr.serialClock;

            const retval=(serialClock<<6)|(serialData<<7);
            return retval|((this.dataPortA | (~this.datadirregA))&0x03);
        }
        else if (addr==0xdc01)
        {
            // cia#1 keybmatrix/joy port A
            return this.buildKeypressByte();
        }
        else if (addr==0xdd01)
        {
            return (this.ciaportB | (~this.datadirregB))&0xff;
        }
        else if ((addr==0xdc02)||(addr==0xdd02))
        {
            return this.datadirregA;
        }
        else if ((addr==0xdc03)||(addr==0xdd03))
        {
            return this.datadirregB;
        }
        else if ((addr==0xdc04)||(addr==0xdd04))
        {
            return this.timerA_dc04;
        }
        else if ((addr==0xdc05)||(addr==0xdd05))
        {
            return this.timerA_dc05;
        }
        else if ((addr==0xdc06)||(addr==0xdd06))
        {
            return this.timerB_dc06;
        }
        else if ((addr==0xdc07)||(addr==0xdd07))
        {
            return this.timerB_dc07;
        }
        else if ((addr==0xdc08)||(addr==0xdd08))
        {
            // $DC08 - Time Of Day, Tenths Of Seconds
            //console.log("CIA "+this.ciaId.toString()+"::TOD returning tenths of seconds ["+this.ciatod.tod10th_bcd+"]");
            this.ciatod.tod_halt=false;
            return this.ciatod.tod10th_bcd;    
        }
        else if ((addr==0xdc09)||(addr==0xdd09))
        {
            // $DC09 - Time Of Day, Seconds
            var sbcd=parseInt(this.ciatod.todsec_bcd.toString(10),16);
            //console.log("CIA "+this.ciaId.toString()+"::TOD returning seconds ["+sbcd.toString(16)+"]");
            return this.ciatod.todsec_bcd;    
        }
        else if ((addr==0xdc0a)||(addr==0xdd0a))
        {
            // $DC0A - Time Of Day, Minutes
            var sbcd=parseInt(this.ciatod.todmin_bcd.toString(10),16);
            //console.log("CIA "+this.ciaId.toString()+"::TOD returning minutes ["+sbcd.toString(16)+"]");
            return this.ciatod.todmin_bcd;    
        }
        else if ((addr==0xdc0b)||(addr==0xdd0b))
        {
            // $DC0B - Time Of Day, Hours
            this.ciatod.tod_halt=true;
            var sbcd=parseInt(this.ciatod.todhour_bcd.toString(10),16);
            //console.log("CIA "+this.ciaId.toString()+"::TOD returning hours ["+sbcd.toString(16)+"]");
            return this.ciatod.todhour_bcd;    
        }
        else if ((addr==0xdc0c)||(addr==0xdd0c))
        {
            return this.sdr;
        }
        else if (addr==0xdc0d)
        {
            // cia1 interrupt control reg
            var ret = this.icr1;
            this.icr1 = 0;
            this.cCpu.ciaIrqPending=false;
            return ret;        
        }
        else if (addr==0xdd0d)
        {
            // cia2 interrupt control reg
            var ret = this.icr1;
            this.icr1 = 0;
            this.cCpu.nmiPending=false;
            return ret;
        }
        else if ((addr==0xdc0e)||(addr==0xdd0e))
        {
            return this.timerACtrl_dc0e;
        }
        else if ((addr==0xdc0f)||(addr==0xdd0f))
        {
            return this.controlReg2;
        }
        else
        {
            console.log("CIA "+this.ciaId.toString()+"::Unmapped read from addr ["+addr.toString(16)+"]");
            return 0;
        }
    }

    writeCIARegister(addr,value)
    {
        if (this.ciaId==1) addr = (addr%0x10) | 0xdc00;
        if (this.ciaId==2) addr = (addr%0x10) | 0xdd00;

        if (addr==0xdd00)
        {
            this.dataPortA=value;
            if (this.ciaId==2)
            {
                // dd00 is connected to the IEC serial bus
                /*
                Bit #3: Serial bus ATN OUT; 0 = High; 1 = Low.
                Bit #4: Serial bus CLOCK OUT; 0 = High; 1 = Low.
                Bit #5: Serial bus DATA OUT; 0 = High; 1 = Low.

                Bit #6: Serial bus CLOCK IN; 0 = Low; 1 = High.
                Bit #7: Serial bus DATA IN; 0 = Low; 1 = High.                
                */

                var dataOut=((value>>5)&0x01); 
                var clockOut=((value>>4)&0x01);
                var atnOut=((value>>3)&0x01);

                // the bits are inverted when sent to the serial... is this correct?
                /*if (dataOut==0) dataOut=1;
                else dataOut=0;
                if (clockOut==0) clockOut=1;
                else clockOut=0;
                if (atnOut==0) atnOut=1;
                else atnOut=0;*/

                this.viaptr.writeSerialBus(dataOut,clockOut,atnOut);

                console.log("CIA 2::wrote to IEC data:"+dataOut+" clock:"+clockOut+" atn:"+atnOut);
            }
        }
        else if (addr==0xdc00)
        {
            this.dataPortA=value;
            //if ((this.ciaId==2)&&(addr==0xdd00)) console.log("CIA2 set dataportA DD00 "+value.toString(16));
        }
        else if ((addr==0xdc01)||(addr==0xdd01))
        {
            this.ciaportB=value;
        }
        else if ((addr==0xdc02)||(addr==0xdd02))
        {
            this.datadirregA=value;
            //if ((this.ciaId==2)&&(addr==0xdd02)) console.log("CIA2 set datadirregA DD02 "+value.toString(16));
        }
        else if ((addr==0xdc03)||(addr==0xdd03))
        {
            this.datadirregB=value;
        }
        else if ((addr==0xdc04)||(addr==0xdd04))
        {
            this.timerA_dc04=value;
            this.timerAlatch|=value&0xff;
            //console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to timer A latch low byte dc04 - latch value is "+this.timerAlatch.toString(16));
        }
        else if ((addr==0xdc05)||(addr==0xdd05))
        {
            this.timerA_dc05=value;
            this.timerAlatch|=(value<<8);
            if ((this.timerACtrl_dc0e&1)==0)
            {
                this.timerA_dc04=this.timerAlatch&0xff;
                this.timerA_dc05=(this.timerAlatch>>8)&0xff;
            }
            //console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to timer A latch high byte dc05 - latch value is "+this.timerAlatch.toString(16));
        }
        else if ((addr==0xdc06)||(addr==0xdd06))
        {
            this.timerB_dc06=value;
            this.timerBlatch|=value&0xff;
        }
        else if ((addr==0xdc07)||(addr==0xdd07))
        {
            this.timerB_dc07=value;
            this.timerBlatch|=(value<<8);
            if ((this.controlReg2&1)==0)
            {
                this.timerB_dc06=this.timerBlatch&0xff;
                this.timerB_dc07=(this.timerBlatch>>8)&0xff;
            }
        }
        else if ((addr==0xdc08)||(addr==0xdd08))
        {
            if ((this.controlReg2&0x80) != 0)
            {
                this.ciatod.alarm10th_bcd=(value&0x0f);
            }
            else
            {
                this.ciatod.tod10th_bcd=(value&0x0f);
            }
        }
        else if ((addr==0xdc09)||(addr==0xdd09))
        {
            if ((this.controlReg2&0x80) != 0)
            {
                this.ciatod.alarmsec_bcd=(value&0x7f);
            }
            else
            {
                this.ciatod.todsec_bcd=(value&0x7f);
            }
        }
        else if ((addr==0xdc0a)||(addr==0xdd0a))
        {
            if ((this.controlReg2&0x80) != 0)
            {
                this.ciatod.alarmmin_bcd=(value&0x7f);
            }
            else
            {
                this.ciatod.todmin_bcd=(value&0x7f);
            }
        }
        else if ((addr==0xdc0b)||(addr==0xdd0b))
        {
            if ((this.controlReg2&0x80) != 0)
            {
                this.ciatod.alarmhour_bcd=(value&0x9f);
            }
            else
            {
                this.ciatod.todhour_bcd=(value&0x9f);
            }
        }
        else if ((addr==0xdc0c)||(addr==0xdd0c))
        {
            // DC0C/DD0C - CIA #1/#2 Synchronous Serial I/O Data Buffer
            // 8bit shift register for serial input/output.
            this.sdr=value;
            this.icr1 |= 8;
            /*if ((this.irqControlReg_dc0d & 8) != 0)
            {
                this.icr1 |= 0x80;
                this.cCpu.ciaIrqPending = true;
            }*/
        }
        else if ((addr==0xdc0d)||(addr==0xdd0d))
        {
            // cia1/2 Interrupt control and status register

            if ((value & 0x80) != 0)
            {
                this.irqControlReg_dc0d |= (value & 0x7f);
            }
            else
            {
                this.irqControlReg_dc0d &= (~value)&0xff;
            }

            if ((this.icr1 & this.irqControlReg_dc0d & 0x1f) != 0)
            {
                this.icr1 |= 0x80;
                if (addr==0xdc0d) this.cCpu.ciaIrqPending = true;
                else if (addr==0xdd0d) this.cCpu.nmiPending=true;
            }
        }
        else if ((addr==0xdc0e)||(addr==0xdd0e))
        {
            this.timerACtrl_dc0e=value&0xef;            
            
            if ((this.timerACtrl_dc0e & 0x01) == 0x01)
            {
                this.timerAisRunning = true;
            }
            else
            {
                this.timerAisRunning = false;
            }            
        }
        else if ((addr==0xdc0f)||(addr==0xdd0f))
        {
            this.controlReg2=value&0xef;
            console.log("CIA "+this.ciaId.toString()+"::wrote to control reg Dx0f "+value.toString(2));

            if ((this.controlReg2 & 0x01) == 0x01) this.timerBisRunning = true;
            else this.timerBisRunning = false;
        }
        else
        {
            console.log("CIA "+this.ciaId.toString()+"::Unmapped write to register ["+addr.toString(16)+"]");
        }
    }
}
