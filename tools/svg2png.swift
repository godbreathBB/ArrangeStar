// 星垣 ArrangeStar · SVG → PNG 渲染器（macOS 原生，无第三方依赖）
// 用法：swift tools/svg2png.swift <in.svg> <out.png> <size>
// 说明：借助 AppKit/NSImage 的矢量渲染，保证 SVG 设计与导出 PNG 完全一致。
import AppKit
import CoreGraphics

let args = CommandLine.arguments
guard args.count >= 4 else {
    print("usage: svg2png <in.svg> <out.png> <size>")
    exit(1)
}
let svgPath = args[1]
let outPath = args[2]
guard let sz = Int(args[3]), sz > 0 else { print("bad size"); exit(1) }

guard let svgData = FileManager.default.contents(atPath: svgPath),
      let img = NSImage(data: svgData) else {
    print("load svg fail: \(svgPath)")
    exit(2)
}

let side = CGFloat(sz)
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil,
        pixelsWide: sz, pixelsHigh: sz, bitsPerSample: 8,
        samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else {
    print("bitmap fail"); exit(3)
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
img.draw(in: NSRect(x: 0, y: 0, width: side, height: side))
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    print("png fail"); exit(4)
}
do {
    try png.write(to: URL(fileURLWithPath: outPath))
    print("OK \(sz) -> \(outPath)")
} catch {
    print("write fail: \(error)"); exit(5)
}
