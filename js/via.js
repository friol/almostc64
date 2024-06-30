/* VIA - 6522 */

class via
{
    constructor(id)
    {
        this.viaId=id;

        this.portA=0;
        this.portB=0;
        this.ddrA=0;
        this.ddrB=0;


    }

    readVIARegister(addr)
    {
        if (this.viaId==1) addr = (addr%0x10) | 0x1800;
        if (this.viaId==2) addr = (addr%0x10) | 0x1c00;



    }

    writeVIARegister(addr,value)
    {
        if (this.viaId==1) addr = (addr%0x10) | 0x1800;
        if (this.viaId==2) addr = (addr%0x10) | 0x1c00;

        if ((addr==0x1800)||(addr==0x1c00))
        {
            // write port B TODO review
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
            console.log("VIA "+this.viaId.toString()+"::Unmapped write to register ["+addr.toString(16)+"]");

        }
    }
}
