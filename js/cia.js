/* or we'll call the CIA */

class cia
{
    constructor(id)
    {
        this.ciaId=id;

        // DC0D/DD0D - CIA #1/#2 CIA Interrupt Control Register (Read Flags/Write Mask)
        this.irqControlReg=0;
        this.dataPortA=0;

    }

    setIrqControlReg(value)
    {
        console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to Irq Control Reg");
        this.irqControlReg=value;
    }

    setDataPortA(value)
    {
        console.log("CIA "+this.ciaId.toString()+"::write ["+value.toString(16)+"] to Data Port A");
        this.dataPortA=value;
    }

}
