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

        this.fdc=fdcCtrl;

        // for now, only one device attached: disk #8
        this.serialBus=0x85;
    }

    linkCia(cia)
    {
        this.cia=cia;
    }

    writeSerialBus(value)
    {
        this.serialBus=value;
    }

    readSerialBus()
    {
        return this.serialBus;
    }

    readVIARegister(addr)
    {
        if (this.viaId==1) addr = (addr%0x10) | 0x1800;
        if (this.viaId==2) addr = (addr%0x10) | 0x1c00;

        if (addr==0x1800)
        {
            //console.log("Reading VIA #1 0x1800");

            const devnr=0; // drive fixed to 8 for now
            const serial_bus = this.serialBus;
            const serial_state =  (serial_bus >> 7)		// DATA
                                        |((serial_bus >> 4) & 0x04)	// CLK
                                        |((this.serialBus << 3) & 0x80); // ATN OUT -> DATA

            return (this.portB & this.ddrB)
                | (serial_state ^ 0x85) 
                | devnr | 0x1A; 
                //| ((via[0].pb7 ^ 0x80) & via[0].acr & 0x80)) & ~via[0].ddrb) ;
        }

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

            const rbyte = ~this.portB & this.ddrB;

            // DATA (including ATN acknowledge)
            this.serialBus = ((rbyte << 6) & ((~rbyte ^ this.serialBus) << 3) & 0x80)	// DATA+ATN
                          |((rbyte << 3) & 0x40); // CLK            
            //console.log("VIA "+this.viaId.toString()+"::write to serial bus value ["+this.serialBus.toString(16)+"]");
        }
        else if (addr==0x1800)
        {
            // write port B TODO review
            console.log("VIA "+this.viaId.toString()+"::write to port B value ["+value.toString(16)+"]");
            this.portB=value;
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
        else
        {
            //console.log("VIA "+this.viaId.toString()+"::Unmapped write to register ["+addr.toString(16)+"]");
        }
    }
}
