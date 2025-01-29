/* VIA - MOS 6522 */

class via
{
    constructor(id,fdcCtrl)
    {
        this.viaId=id;
        this.fdc=fdcCtrl;

        this.portA=0;
        this.portB=0;
        this.ddrA=0;
        this.ddrB=0;

        this.pa_in=0;
        this.pb_in=0;

        this.ifr=0; // interrupt flag register
        this.ier=0; // interrupt enable register
        this.pcr=0;
        this.acr=0;
        this.sr=0; // shift register

        this.t1c=0xffff; // timer 1 counter
        this.t1l=0xffff; // latch
        this.t2c=0xffff; // timer 2 counter
        this.t2l=0xffff; // latch

        this.t1_irq_blocked=false;
        this.t2_irq_blocked=false;
    }

    linkCia(cia)
    {
        this.cia=cia;
    }

    linkCpu(cpu)
    {
        this.cpuPtr=cpu;
    }

    TriggerCA1Interrupt()
    {
        if (this.pcr & 0x01) {		// CA1 positive edge (1541 gets inverted bus signals)
            this.ifr |= 0x02;
            if (this.ier & 0x02) {	// CA1 interrupt enabled?
                this.ifr |= 0x80;

                console.log("VIA "+this.viaId+" triggers 1541 irq");
                //globalEmuStatus=0;
                
                if (this.viaId==1) this.cpuPtr.via1IrqPending=true;
                if (this.viaId==2) this.cpuPtr.via2IrqPending=true;
            }
        }
    }

    SetPAIn(val)
    {
        this.pa_in = val;
    }

    SetPBIn(val)
    {
        this.pb_in = val;
    }

	PAOut()
    { 
        return this.portA | ~this.ddrA; 
    }

	PBOut()
    { 
        return this.portB | ~this.ddrB; 
    }

    clear_irq(flag)
    {
        this.ifr &= ~flag;
        if (((this.ifr & this.ier) & 0x7f) == 0) 
        {
            this.ifr &= 0x7f;
            //console.log("clearing irq");
            //the_cpu->ClearInterrupt(irq_type);
            if (this.viaId==1) this.via1IrqPending=false;
            if (this.viaId==2) this.via2IrqPending=false;
        }
    }

    readVIARegister(addr)
    {
        if ((addr&0x0f)==0)
        {
            //console.log("Reading VIA #1 0x1800");
            this.clear_irq(0x10);	// Clear CB1 interrupt
			return (this.portB & this.ddrB) | (this.pb_in & ~this.ddrB);
        }
        else if ((addr&0x0f)==1)
        {
			this.clear_irq(0x02);	// Clear CA1 interrupt
			return (this.portA & this.ddrA) | (this.pa_in & ~this.ddrA);
        }
        else if ((addr&0x0f)==2)
        {
            return this.ddrB;
        }
        else if ((addr&0x0f)==3)
        {
            return this.ddrA;
        }
        else if ((addr&0x0f)==4)
        {
            this.clear_irq(0x40);	// Clear T1 interrupt
            return this.t1c & 0xFF;            
        }
        else if ((addr&0x0f)==5)
        {
            return (this.t1c>>8)&0xff;
        }
        else if ((addr&0x0f)==6)
        {
            return this.t1c&0xff;
        }
        else if ((addr&0x0f)==7)
        {
            return (this.t1l>>8)&0xff;
        }
        else if ((addr&0x0f)==8)
        {
			this.clear_irq(0x20);	// Clear T2 interrupt
			return this.t2c&0xff;
        }
        else if ((addr&0x0f)==9)
        {
            return (this.t2c>>8)&0xff;
        }
        else if ((addr&0x0f)==0x0a)
        {
            return this.sr;
        }
        else if ((addr&0x0f)==0x0b)
        {
            return this.acr;
        }
        else if ((addr&0x0f)==0x0c)
        {
            return this.pcr;            
        }
        else if ((addr&0x0f)==0x0d)
        {
            //return this.ifr | (((this.ifr & this.ier) & 0x7F) ? 0x80 : 0);
            return this.ifr;
        }
        else if ((addr&0x0f)==0x0e)
        {
            return this.ier | 0x80;
        }
        else if ((addr&0x0f)==0x0f)
        {
			return (this.portA & this.ddrA) | (this.pa_in & ~this.ddrA);
        }
        else
        {
            console.log("VIA "+this.viaId.toString()+"::Unmapped read from register ["+addr.toString(16)+"]");
        }

        return 0;
    }

    writeVIARegister(addr,value)
    {
        if ((addr&0x0f)==0)
        {
            // write port B
            //console.log("VIA "+this.viaId.toString()+"::write to port B value ["+value.toString(16)+"]");
            this.portB=value;
            this.clear_irq(0x10);	// Clear CB1 interrupt
        }
        else if ((addr&0x0f)==1)
        {
            // write port A
            this.portA=value;            
			this.clear_irq(0x02);	// Clear CA1 interrupt
        }
        else if ((addr&0x0f)==2)
        {
            this.ddrB=value;            
        }
        else if ((addr&0x0f)==3)
        {
            this.ddrA=value;            
        }
        else if (((addr&0xf)==4)||((addr&0xf)==6))
        {
            this.t1l = (this.t1l & 0xFF00) | value;
        }
        else if ((addr&0xf)==5)
        {
            // write T1 high order counter, read from low order latch
            this.t1l = (this.t1l & 0xFF) | (value << 8);
            this.t1c=this.t1l;
            this.t1_irq_blocked = false;
			this.clear_irq(0x40);	// Clear T1 interrupt
        }
        else if ((addr&0x0f)==7)
        {
            // write T1 high order latch
            this.t1l = (this.t1l & 0xFF) | (value << 8);
			this.clear_irq(0x40);	// Clear T1 interrupt
        }
        else if ((addr&0x0f)==8)
        {
            this.t2l = (this.t2l & 0xff00) | value;            
        }
        else if ((addr&0x0f)==9)
        {
			this.t2l = (this.t2l & 0xff) | (value << 8);
			this.t2c = this.t2l;
			this.t2_irq_blocked = false;
			this.clear_irq(0x20);	// Clear T2 interrupt        
        }
        else if ((addr&0x0f)==0x0a)
        {
            this.sr=value;
        }
        else if ((addr&0x0f)==0x0b)
        {
            this.acr=value;            
        }
        else if ((addr&0x0f)==0x0c)
        {
            this.pcr=value;            
        }
        else if ((addr&0x0f)==0x0d)
        {
            //this.ifr &= ~(value | 0x80);
            this.clear_irq(value & 0x7f);
        }
        else if ((addr&0x0f)==0x0e)
        {
            if (value & 0x80) this.ier |= value & 0x7F;
            else this.ier &= ~value;            
        }
        else if ((addr&0x0f)==0x0f)
        {
            this.portA=value;
        }
        else
        {
            console.log("VIA "+this.viaId.toString()+"::Unmapped write to register ["+addr.toString(16)+"]");
        }
    }

    countTimer(cycles)
    {
        let tmp=this.t1c - cycles;
        
        this.t1c = this.t1c - cycles;
        if (this.t1c<0)
        {
            this.t1c=0xffff+this.t1c;
            if ((this.t1c<0)||(this.t1c>0xffff))
            {
                alert("This should not happen");
            }
        }

        if ((this.t1c<0)||(this.t1c>0xffff))
        {
            alert("This should not happen");
        }

        if (tmp<0) 
        {
            if (!this.t1_irq_blocked) 
            {
                this.ifr |= 0x40;
                if (this.ier & 0x40) 
                {
                    //console.log("timer irq!");
                    if (this.viaId==1) this.cpuPtr.via1IrqPending=true;
                    if (this.viaId==2) this.cpuPtr.via2IrqPending=true;
                }
            }
            if ((this.acr & 0x40) == 0) {	// One-shot mode
                this.t1_irq_blocked = true;
            }
            this.t1c = this.t1l;					// Reload from latch
        }
    
        if ((this.acr & 0x20) == 0) {		// Only count in one-shot mode
            let tmp=this.t2c - cycles;

            this.t2c= this.t2c - cycles;
            if (this.t2c<0)
            {
                this.t2c=0xffff+this.t2c;
            }

            if ((this.t2c<0)||(this.t2c>0xffff))
            {
                alert("This should not happen");
            }
                    
            if (tmp<0) 
            {
                if (!this.t2_irq_blocked) {
                    this.t2_irq_blocked = true;
                    this.ifr |= 0x20;
                    if (this.ier & 0x20) {
                        console.log("one shottin timer irq!");
                        if (this.viaId==1) this.cpuPtr.via1IrqPending=true;
                        if (this.viaId==2) this.cpuPtr.via2IrqPending=true;
                    }
                }
            }
        }
    }
}
