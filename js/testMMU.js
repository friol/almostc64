/* MMU for testing purposes */

class testMMU
{
    constructor()
    {
        this.ram64k=new Array(0x10000);
        for (var i=0;i<0x10000;i++)
        {
            this.ram64k[i]=0;
        }

    }

    cleanMem()
    {
        for (var i=0;i<0x10000;i++)
        {
            this.ram64k[i]=0;
        }
    }

    readAddr(addr)
    {
        if ((addr>=0)&&(addr<=0xffff))
        {
            return this.ram64k[addr];            
        }

        console.log("testMMU::error: reading outside 64k mem");
    }

    writeAddr(addr,value)
    {
        if ((addr>=0)&&(addr<=0xffff))
        {
            this.ram64k[addr]=value;            
        }
        else
        {
            console.log("testMMU::error: writing outside 64k mem");
        }
    }

    readAddr16bit(addr)
    {
        if (addr<=0xff) return (((this.readAddr(addr&0xffff))|(this.readAddr((addr+1)&0xff)<<8))&0xffff);
        return (this.readAddr(addr&0xffff)|(((this.readAddr((addr+1)&0xffff)&0xff)<<8)))&0xffff;
    }

    getWrappedAddr(addr)
    {
        if ((addr & 0xff) == 0xff)
        {
            return ((this.readAddr(addr&0xff00)) << 8) | (this.readAddr(addr));
        }
        else
        {
            return ((this.readAddr(addr + 1)) << 8) | (this.readAddr(addr));
        }
    }    

    checkSO()
    {
        return false;
    }
}
