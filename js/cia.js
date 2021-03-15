/* or we'll call the CIA */

class cia
{
    constructor(id)
    {
        this.ciaId=id;

        this.icr1=0;
        this.irqControlReg_dc0d=0;
        this.dataPortA=0;

        this.timerAlatch=0;
        this.timerA_dc04=0;
        this.timerA_dc05=0;
        this.timerACtrl_dc0e=0;
        this.timerAisRunning=false;

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
            "xx", "q", "pageup", " ", "2", "ctrl", "delete", "1",
            "Slash","^", "=","rs","home",";","*","INS",
            ",","@",":",".","-","l","p","+",
            "n","o","k","m","0","j","i","9",
            "v","u","h","b","8","g","y","7",
            "x","t","f","c","6","d","r","5",
            "lshift","e","s","z","4","a","w","3",
            "k2","f5","f3","f1","f7","eee","Enter","del"
        ];        
    }

    setIrqControlReg(value)
    {
        console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to Irq Control Reg");
        this.irqControlReg_dc0d=value;
    }

    setDataPortA(value)
    {
        console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to Data Port A");
        this.dataPortA=value;
    }

    keyPress(kv)
    {
        this.keyboardKeyList.push(kv);
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
        var retByte = 0xff;

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

                    if ((this.dataPortA & (1<<(7-keyrow))) == 0)
                    {
                        retByte&=(~(1<<(7-keycol)))&0xff;
                    }
                }
                pos++;
            }
        }

        return retByte;
    }

    update(elapsedCycles,theCpu)
    {
        if (this.timerAisRunning)
        {
            var timerLow = this.timerA_dc04;
            var timerHigh = this.timerA_dc05;
            var timerVal = timerLow | (timerHigh << 8);

            timerVal -= elapsedCycles;
            if (timerVal <= 0)
            {
                this.icr1 |= 0x01;
                if ((this.irqControlReg_dc0d & 0x01) == 0x01)
                {
                    // trigger maskable irq
                    theCpu.ciaIrqPending=true;
                    this.icr1 |= 0x80;
                }

                // va ritriggerato?
                if ((this.timerACtrl_dc0e & 0x08) == 0)
                {
                    this.timerA_dc04 = (this.timerAlatch & 0xff);
                    this.timerA_dc05 = ((this.timerAlatch>>8) & 0xff);
                }
                else
                {
                    this.timerAisRunning = false;
                }
            }
            else
            {
                this.timerA_dc04 = (timerVal & 0xff);
                this.timerA_dc05 = ((timerVal >> 8) & 0xff);
            }
        }
    }

    readCIARegister(addr)
    {
        if (addr==0xdd00)
        {
            return this.dataPortA;
        }
        else if (addr==0xdc01)
        {
            // cia#1 keybmatrix/joy port A
            return this.buildKeypressByte();
        }
        else if (addr==0xdc0e)
        {
            return this.timerACtrl_dc0e;
        }
        else
        {
            console.log("CIA "+this.ciaId.toString()+"::Unmapped read from addr ["+addr.toString(16)+"]");
        }
    }

    writeCIARegister(addr,value)
    {
        if ((addr==0xdc00)||(addr==0xdd00))
        {
            this.setDataPortA(value);
        }
        else if (addr==0xdc04)
        {
            this.timerA_dc04=value;
            this.timerAlatch|=value&0xff;
            console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to timer A latch low byte dc04 - latch value is "+this.timerAlatch.toString(16));
        }
        else if (addr==0xdc05)
        {
            this.timerA_dc05=value;
            this.timerAlatch|=(value<<8)&0xff00;
            console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to timer A latch high byte dc05 - latch value is "+this.timerAlatch.toString(16));
        }
        else if (addr==0xdc0d)
        {
            this.setIrqControlReg(value);
        }
        else if (addr==0xdc0e)
        {
            this.timerACtrl_dc0e=value;            
            
            if ((this.timerACtrl_dc0e & 0x01) == 0x01)
            {
                this.timerAisRunning = true;
            }
            else
            {
                this.timerAisRunning = false;
            }            
        }
        else if (addr==0xdd0d)
        {
            this.setIrqControlReg(value);
        }
        else
        {
            console.log("CIA "+this.ciaId.toString()+"::Unmapped write to register ["+addr.toString(16)+"]");
        }
    }

}
