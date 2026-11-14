param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Prefix)
# Slice the generated atlas; no pose deformation, repainting or resampling.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class ResultAtlas {
 public static void Slice(string source,string folder,string prefix) {
  string[] poses={"defeated_front","sad","frustrated","exhausted","sad_idle","sad_idle_breath"};
  using(var atlas=new Bitmap(source)) {
   var frames=new Bitmap[6];int left=atlas.Width,top=atlas.Height,right=0,bottom=0;
   for(int f=0;f<6;f++) {
    int x=f*atlas.Width/6,w=(f+1)*atlas.Width/6-x;
    var frame=frames[f]=new Bitmap(w,atlas.Height,PixelFormat.Format32bppArgb);
    using(var g=Graphics.FromImage(frame))g.DrawImage(atlas,new Rectangle(0,0,w,atlas.Height),new Rectangle(x,0,w,atlas.Height),GraphicsUnit.Pixel);
    var bits=frame.LockBits(new Rectangle(0,0,w,frame.Height),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
    byte[] data=new byte[bits.Stride*frame.Height];Marshal.Copy(bits.Scan0,data,0,data.Length);
    for(int y=0;y<frame.Height;y++)for(int px=0;px<w;px++) {
     int p=y*bits.Stride+px*4;
     if(data[p+3]<200){data[p+3]=0;continue;}
     left=Math.Min(left,px);right=Math.Max(right,px);top=Math.Min(top,y);bottom=Math.Max(bottom,y);
    }
    Marshal.Copy(data,0,bits.Scan0,data.Length);frame.UnlockBits(bits);
   }
   for(int f=0;f<6;f++)using(var frame=frames[f])using(var crop=frame.Clone(new Rectangle(left,top,Math.Min(right+1,frame.Width)-left,bottom-top+1),PixelFormat.Format32bppArgb))
    crop.Save(System.IO.Path.Combine(folder,prefix+"_result_"+poses[f]+".png"),ImageFormat.Png);
  }
 }
}
'@
[ResultAtlas]::Slice((Resolve-Path -LiteralPath $Source).Path,(Join-Path (Get-Location) 'assets/sprites/ceremony'),$Prefix)
