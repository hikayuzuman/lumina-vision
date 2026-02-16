"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Mode = "adjust" | "paint" | "text";

const Editor = () => {
    const [image, setImage] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>("adjust");

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // States for Adjust
    const [filter, setFilter] = useState({
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
    });

    // States for Paint
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState("#9d00ff");
    const [brushSize, setBrushSize] = useState(5);
    const [isEraser, setIsEraser] = useState(false);

    // States for Text
    const [texts, setTexts] = useState<{ id: number, text: string, x: number, y: number, color: string, fontSize: number }[]>([]);
    const [inputText, setInputText] = useState("");
    const [textColor, setTextColor] = useState("#ffffff");
    const [textSize, setTextSize] = useState(24);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result as string);
                setFilter({
                    brightness: 100, contrast: 100, saturate: 100,
                    blur: 0, grayscale: 0, sepia: 0, hueRotate: 0,
                });
                setTexts([]);
                // Clear drawing canvas when new image is uploaded
                const ctx = drawingCanvasRef.current?.getContext("2d");
                if (ctx && drawingCanvasRef.current) {
                    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Initialize drawing canvas size based on preview size
    useEffect(() => {
        if (image && drawingCanvasRef.current && containerRef.current) {
            const img = new Image();
            img.src = image;
            img.onload = () => {
                const container = containerRef.current;
                if (!container) return;

                // We want the drawing canvas to match the displayed image size exactly
                const displayWidth = container.clientWidth;
                const displayHeight = container.clientHeight;

                drawingCanvasRef.current.width = displayWidth;
                drawingCanvasRef.current.height = displayHeight;
            };
        }
    }, [image]);

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== "paint") return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = drawingCanvasRef.current?.getContext("2d");
        ctx?.beginPath();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || mode !== "paint") return;
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";

        if (isEraser) {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = brushColor;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    // Text Logic
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (mode !== "text" || !inputText) return;

        const rect = drawingCanvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setTexts([...texts, {
            id: Date.now(),
            text: inputText,
            x: x,
            y: y,
            color: textColor,
            fontSize: textSize
        }]);
        setInputText(""); // Clear after placing
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !image) return;

        const img = new Image();
        img.src = image;
        img.onload = () => {
            // Set canvas size to original image size
            canvas.width = img.width;
            canvas.height = img.height;

            // 1. Apply Filters and Draw Image
            ctx.filter = `
                brightness(${filter.brightness}%) 
                contrast(${filter.contrast}%) 
                saturate(${filter.saturate}%) 
                blur(${filter.blur}px) 
                grayscale(${filter.grayscale}%) 
                sepia(${filter.sepia}%) 
                hue-rotate(${filter.hueRotate}deg)
            `;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // 2. Draw Hand-drawings from the overlay canvas
            // We need to scale the overlay drawing to match original image size
            const drawingCanvas = drawingCanvasRef.current;
            if (drawingCanvas) {
                ctx.filter = "none"; // Disable filters for drawing/text
                ctx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, img.width, img.height);
            }

            // 3. Draw Texts
            texts.forEach(t => {
                const scaleX = img.width / (drawingCanvas?.width || 1);
                const scaleY = img.height / (drawingCanvas?.height || 1);
                ctx.fillStyle = t.color;
                ctx.font = `${t.fontSize * scaleX}px sans-serif`;
                ctx.fillText(t.text, t.x * scaleX, t.y * scaleY);
            });

            const link = document.createElement("a");
            link.download = "edited-image.png";
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
    };

    const filterString = `
        brightness(${filter.brightness}%) 
        contrast(${filter.contrast}%) 
        saturate(${filter.saturate}%) 
        blur(${filter.blur}px) 
        grayscale(${filter.grayscale}%) 
        sepia(${filter.sepia}%) 
        hue-rotate(${filter.hueRotate}deg)
    `;

    return (
        <div className="editor-container">
            <header className="glass header">
                <h1 className="gradient-text">Lumina Vision</h1>
                <div className="mode-switcher glass">
                    <button className={mode === "adjust" ? "active" : ""} onClick={() => setMode("adjust")}>調整</button>
                    <button className={mode === "paint" ? "active" : ""} onClick={() => setMode("paint")}>ペイント</button>
                    <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>テキスト</button>
                </div>
                <div className="actions">
                    <label className="button primary">
                        アップロード
                        <input type="file" hidden accept="image/*" onChange={handleUpload} />
                    </label>
                    {image && (
                        <button className="button outline" onClick={handleDownload}>
                            保存
                        </button>
                    )}
                </div>
            </header>

            <main className="editor-main">
                <section className="preview-area glass">
                    {image ? (
                        <div className="image-container" ref={containerRef} style={{ position: 'relative' }}>
                            <img
                                src={image}
                                style={{ filter: filterString }}
                                alt="Preview"
                                className="main-preview"
                            />
                            <canvas
                                ref={drawingCanvasRef}
                                className="drawing-canvas"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onClick={handleCanvasClick}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    cursor: mode === "adjust" ? "default" : "crosshair",
                                    pointerEvents: mode === "adjust" ? "none" : "auto"
                                }}
                            />
                            {texts.map(t => (
                                <div key={t.id} style={{
                                    position: 'absolute',
                                    left: t.x,
                                    top: t.y,
                                    color: t.color,
                                    fontSize: t.fontSize,
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                    transform: 'translate(0, -50%)',
                                    fontWeight: 'bold'
                                }}>
                                    {t.text}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>画像をアップロードして編集を開始してください</p>
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </section>

                <aside className="controls-area glass">
                    {mode === "adjust" && (
                        <>
                            <h3>画像調整</h3>
                            <div className="control-group">
                                <label>明るさ ({filter.brightness}%)</label>
                                <input type="range" min="0" max="200" value={filter.brightness} onChange={(e) => setFilter({ ...filter, brightness: parseInt(e.target.value) })} />
                            </div>
                            <div className="control-group">
                                <label>コントラスト ({filter.contrast}%)</label>
                                <input type="range" min="0" max="200" value={filter.contrast} onChange={(e) => setFilter({ ...filter, contrast: parseInt(e.target.value) })} />
                            </div>
                            <div className="control-group">
                                <label>彩度 ({filter.saturate}%)</label>
                                <input type="range" min="0" max="200" value={filter.saturate} onChange={(e) => setFilter({ ...filter, saturate: parseInt(e.target.value) })} />
                            </div>
                            <div className="control-group">
                                <label>ぼかし ({filter.blur}px)</label>
                                <input type="range" min="0" max="20" value={filter.blur} onChange={(e) => setFilter({ ...filter, blur: parseInt(e.target.value) })} />
                            </div>
                            <div className="control-group">
                                <label>グレースケール ({filter.grayscale}%)</label>
                                <input type="range" min="0" max="100" value={filter.grayscale} onChange={(e) => setFilter({ ...filter, grayscale: parseInt(e.target.value) })} />
                            </div>
                            <div className="control-group">
                                <label>セピア ({filter.sepia}%)</label>
                                <input type="range" min="0" max="100" value={filter.sepia} onChange={(e) => setFilter({ ...filter, sepia: parseInt(e.target.value) })} />
                            </div>
                            <button className="button reset" onClick={() => setFilter({ brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0 })}>リセット</button>
                        </>
                    )}

                    {mode === "paint" && (
                        <>
                            <h3>ペイント設定</h3>
                            <div className="tool-toggle glass">
                                <button className={!isEraser ? "active" : ""} onClick={() => setIsEraser(false)}>ブラシ</button>
                                <button className={isEraser ? "active" : ""} onClick={() => setIsEraser(true)}>消しゴム</button>
                            </div>
                            <div className="control-group">
                                <label>ブラシの色</label>
                                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} disabled={isEraser} />
                            </div>
                            <div className="control-group">
                                <label>サイズ ({brushSize}px)</label>
                                <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} />
                            </div>
                            <button className="button reset" onClick={() => {
                                const ctx = drawingCanvasRef.current?.getContext("2d");
                                if (ctx && drawingCanvasRef.current) ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                            }}>クリア</button>
                        </>
                    )}

                    {mode === "text" && (
                        <>
                            <h3>テキスト追加</h3>
                            <div className="control-group">
                                <label>入力内容</label>
                                <input
                                    className="text-input glass"
                                    type="text"
                                    placeholder="ここに入力して画像をクリック"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />
                            </div>
                            <div className="control-group">
                                <label>文字の色</label>
                                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                            </div>
                            <div className="control-group">
                                <label>サイズ ({textSize}px)</label>
                                <input type="range" min="10" max="100" value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value))} />
                            </div>
                            <button className="button reset" onClick={() => setTexts([])}>全削除</button>
                        </>
                    )}
                </aside>
            </main>

            <style jsx>{`
                .editor-container { padding: 2rem; min-height: 100vh; display: flex; flex-direction: column; gap: 2rem; max-width: 1400px; margin: 0 auto; }
                .header { padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
                .mode-switcher { display: flex; padding: 4px; border-radius: 12px; }
                .mode-switcher button { padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; color: var(--text-muted); }
                .mode-switcher button.active { background: var(--primary); color: white; }
                
                .actions { display: flex; gap: 1rem; }
                .button { padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 600; }
                .button.primary { background: var(--primary); color: white; }
                .button.outline { border: 1px solid var(--primary); color: var(--primary); }
                
                .editor-main { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; flex: 1; }
                .preview-area { display: flex; align-items: center; justify-content: center; min-height: 500px; padding: 2rem; }
                .image-container { display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px; overflow: hidden; }
                .main-preview { display: block; max-width: 100%; max-height: 70vh; object-fit: contain; }
                .drawing-canvas { width: 100%; height: 100%; }

                .controls-area { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
                .control-group { display: flex; flex-direction: column; gap: 0.8rem; }
                .control-group label { font-size: 0.9rem; color: var(--text-muted); }
                .text-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 0.8rem; border-radius: 8px; color: white; outline: none; }
                
                .tool-toggle { display: flex; padding: 4px; border-radius: 10px; margin-bottom: 0.5rem; }
                .tool-toggle button { flex: 1; padding: 0.5rem; border-radius: 6px; font-size: 0.85rem; color: var(--text-muted); }
                .tool-toggle button.active { background: rgba(255,255,255,0.1); color: white; }

                .button.reset { border: 1px solid var(--border); color: var(--text-muted); margin-top: 1rem; }
                .button.reset:hover { border-color: #ff4d4d; color: #ff4d4d; }

                @media (max-width: 900px) {
                    .editor-main { grid-template-columns: 1fr; }
                    .header { flex-direction: column; gap: 1rem; }
                }
            `}</style>
        </div>
    );
};

export default Editor;
