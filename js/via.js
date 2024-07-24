/* VIA - 6522 */

class via
{
    constructor(id,fdcCtrl)
    {
        this.viaId=id;

        this.portA=0;
        this.portB=0;
        this.ddrA=0;
        this.ddrB=0;

        this.ifr=0;
        this.ier=0;
        this.pcr=0;
        this.acr=0;
        this.t1l=0xffff;
        this.t1c=0xffff;
        this.t1r = 0;
        this.t1r = 0;
        this.t1t = 0;
        this.pb7 = 0x80;
        this.pb7trigger = false;

        this.IRQM_T1 = 0x40;

        this.fdc=fdcCtrl;

        // IEC BUS
        this.serialData=0;
        this.serialClock=0;
        this.serialAtn=0;
    }

    linkCia(cia)
    {
        this.cia=cia;
    }

    writeSerialBus(data,clock,atn)
    {
        this.serialData=data;
        this.serialClock=clock;
        this.serialAtn=atn;
    }

    readVIARegister(addr)
    {
        if (this.viaId==1) addr = (addr%0x10) | 0x1800;
        if (this.viaId==2) addr = (addr%0x10) | 0x1c00;

        if (addr==0x1800)
        {
            //console.log("Reading VIA #1 0x1800");

            const devnr=0; // drive fixed to 8 for now
            /*const serial_bus = this.serialBus;
            const serial_state =  (serial_bus >> 7)		// DATA
                                        |((serial_bus >> 4) & 0x04)	// CLK
                                        |((this.serialBus << 3) & 0x80); // ATN OUT -> DATA

            return (this.portB & this.ddrB)
                | (serial_state ^ 0x85) 
                | devnr | 0x1A; 
                //| ((via[0].pb7 ^ 0x80) & via[0].acr & 0x80)) & ~via[0].ddrb) ;*/

            var retval=0;
            retval|=(this.serialData&0x01);
            retval|=((this.serialClock<<2));
            retval|=((this.serialAtn<<7));
            return (this.portB & ~this.ddrB)
            | (retval ^ 0x85) 
            | devnr | 0x1A;
        }
        else if (addr==0x1801)
        {
            return (this.portA & ~this.ddrA);
        }
        else if (addr==0x1c00)
        {
            return (this.portB & this.ddrB)| 
            (this.fdc.syncFound() & ~this.ddrB);
        }
        else if (addr==0x1c0f)
        {
            // return fdc->readGCRByte();
            const k=Math.floor(Math.random()*255);            
            return k;
        }
        else if ((addr==0x1804)||(addr==0x1c04))
        {
            // Clear T1 IRQ flag
            this.ifr &= ~this.IRQM_T1;
            //checkIrqCallback(callBackParam, ifr & ier);
            return this.t1c & 0xFF;            
        }
        else if ((addr==0x1807)||(addr==0x1c07))
        {
            return this.t1l >> 8;
        }
        else if ((addr==0x180c)||(addr==0x1c0c))
        {
            return this.pcr;            
        }
        else
        {
            console.log("VIA "+this.viaId.toString()+"::Unmapped read from register ["+addr.toString(16)+"]");
        }
   

        return 0;
    }

    writeVIARegister(addr,value)
    {
        if (this.viaId==1) addr = (addr%0x10) | 0x1800;
        if (this.viaId==2) addr = (addr%0x10) | 0x1c00;

        if (addr==0x1c00)
        {
            // bits 0/1: Head stepper motor
            if ((this.portB ^ value) & 3) 
            {
                if ((this.portB & 3) == ((value + 1) & 3))
                {
                    this.fdc.moveHeadOut();
                }
                else if ((this.portB & 3) == ((value - 1) & 3))
                {
                    this.fdc.moveHeadIn();
                }
            }
            // bit #3: Drive LED
            //				if ((via[1].prb ^ value) & 8)
            //					theLed->Update( (value << 2) & 0x20 );
            // bit #2: Drive motor on/off
            //if ((via[1].prb ^ value) & 4)
            //    fdc->SetDriveMotor(value & 4);
            // Bit 5 and 6 density select
            //if ((via[1].prb ^ value) & 0x60)
            //    fdc->SetDensity(value & 0x60);
            // Bit 7 is synch?

            this.portB = value & 0xEF;

            //console.log("VIA "+this.viaId.toString()+"::write to serial bus value ["+this.serialBus.toString(16)+"]");
        }
        else if (addr==0x1800)
        {
            // write port B TODO review
            console.log("VIA "+this.viaId.toString()+"::write to port B value ["+value.toString(16)+"]");
            this.portB=value;

            this.serialData=(value>>1)&0x01;
            this.serialClock=(value>>3)&0x01;
        }
        else if ((addr==0x1801)||(addr==0x1c01))
        {
            // write port A TODO review
            this.portA=value;            
        }
        else if ((addr==0x1802)||(addr==0x1c02))
        {
            this.ddrB=value;            
        }
        else if ((addr==0x1803)||(addr==0x1c03))
        {
            this.ddrA=value;            
        }
        else if ((addr==0x1805)||(addr==0x1c05))
        {
            // write T1 high order counter, read from low order latch
            this.t1l = (this.t1l & 0xFF) | (value << 8);
            // trigger a reload
            this.t1r = 1;
            // Clear T1 IRQ
            this.ifr &= ~this.IRQM_T1;
            //checkIrqCallback(callBackParam, ifr & ier);
            this.t1t = 0;
            // PB7 square wave output
            // if PB7 is programmed as a T1 output it will go low on the phi2 following the write operation
            if (this.acr & 0xC0) 
            {
                this.pb7 = 0;
                this.pb7trigger = false;
            }
        }
        else if ((addr==0x1806)||(addr==0x1c06))
        {
            this.t1l = (this.t1l & 0xFF00) | value;
        }
        else if ((addr==0x1807)||(addr==0x1c07))
        {
            // write T1 high order latch
            this.t1l = (this.t1l & 0xFF) | (value << 8);
            // despite what official docs state, it does clear the interrupt flag
            this.ifr &= ~this.IRQM_T1;
            //checkIrqCallback(callBackParam, ifr & ier);
        }
        else if ((addr==0x180b)||(addr==0x1c0b))
        {
            this.acr=value;            
        }
        else if ((addr==0x180c)||(addr==0x1c0c))
        {
            this.pcr=value;            
        }
        else if ((addr==0x180d)||(addr==0x1c0d))
        {
            this.ifr &= ~(value | 0x80);
            //checkIrqCallback(callBackParam, ifr & ier & 0x7F);        
        }
        else if ((addr==0x180e)||(addr==0x1c0e))
        {
            if (value & 0x80) this.ier |= value & 0x7F;
            else this.ier &= ~value;            
        }
        else
        {
            console.log("VIA "+this.viaId.toString()+"::Unmapped write to register ["+addr.toString(16)+"]");
        }
    }
}
