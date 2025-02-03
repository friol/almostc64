/* not a cart */

class cart
{
    constructor()
    {
        this.lineEXROM=1;
        this.lineGAME=1;

        this.banks=new Array();
        this.banks[0]=new Array(0x4000);

        this.cartLoaded=false;
    }

    loadCart(arr)
    {
        let cartSignature="";
        for (var i=0;i<0x10;i++)        
        {
            cartSignature+=String.fromCharCode(arr[i]);
        }

        // TODO: should be "C64 CARTRIDGE"
        console.log("Cart signature: ["+cartSignature+"]");

        //

        let len3=arr[0x13];
        if (len3!=0x40)
        {
            alert("Error: header len of .crt not equal to 0x40")
            return 1;
        }

        let cartVer=arr[0x14]+" "+arr[0x15];
        console.log("Cart version: "+cartVer);

        // $0016-$0017 - Cartridge hardware type ($0000, high/low)

        let cartHwType=(arr[0x16]<<8)|arr[0x17];
        console.log("Cartridge type: ["+cartHwType+"]");
        if (cartHwType!=0)
        {
            alert("Error: only cartridge type 0 is supported at the moment.");
            return 1;
        }

        this.lineEXROM=arr[0x18];
        this.lineGAME=arr[0x19];
        
        console.log("EXROM: "+this.lineEXROM+" GAME:"+this.lineGAME);

        // $0020-$003F - 32-byte cartridge  name  (uppercase,  padded with null characters)

        let cartName="";
        for (var i=0;i<0x20;i++)        
        {
            cartName+=String.fromCharCode(arr[0x20+i]);
        }

        console.log("Cartridge name: ["+cartName+"]");

        // now with the data! (chip packets)

        let chipSignature="";
        for (var i=0;i<0x4;i++)        
        {
            chipSignature+=String.fromCharCode(arr[0x40+i]);
        }

        console.log("Chip signature: ["+chipSignature+"]");

        let totalPacketLen=(arr[0x40+0x07]|(arr[0x40+0x06]<<8)|(arr[0x40+0x05]<<16)|(arr[0x40+0x04]<<24))-0x10;
        console.log("Packet len: ["+totalPacketLen+"]");

        // $000E-$000F - ROM image size in bytes  (high/low format, typically $2000 or $4000)
        let romLen=arr[0x40+0x0f]|(arr[0x40+0x0e]<<8);
        console.log("ROM len: ["+romLen+"]");

        for (var b=0;b<romLen;b++)
        {
            this.banks[0][b]=arr[0x50+b];
        }

        this.cartLoaded=true;
        console.log("Cartridge successfully loaded.");
        return 0;
    }
}
