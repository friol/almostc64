/* c64 mythical VIC-II chip */

class vic
{
    constructor()
    {
        this.controlreg=0;
        this.controlreg2=0;

    }

    setControlReg2(value)
    {
        console.log("VIC::write ["+value.toString(16)+"] to Control Reg2");
        this.controlreg2=value;
    }

    simpleRenderer()
    {

    }
}
