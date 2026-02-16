"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "adjust" | "paint" | "text";

interface TextObject {
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
}

const Editor = () => {
    const [image, setImage] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>("adjust");

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Global States
    const [zoom, setZoom] = useState(1);

    // States for Adjust
    const [filter, setFilter] = useState({
        brightness: 100, contrast: 100, saturate: 100,
        blur: 0, grayscale: 0, sepia: 0, hueRotate: 0,
    });

    // States for Paint
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState("#9d00ff");
    const [brushSize, setBrushSize] = useState(5);
    const [isEraser, setIsEraser] = useState(false);

    // States for Text
    const [texts, setTexts] = useState<TextObject[]>([]);
    const [inputText, setInputText] = useState("");
    const [textColor, setTextColor] = useState("#ffffff");
    const [textSize, setTextSize] = useState(24);
    const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
    const [isDraggingText, setIsDraggingText] = useState(false);

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
                setZoom(1);
                const ctx = drawingCanvasRef.current?.getContext("2d");
                if (ctx && drawingCanvasRef.current) {
                    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Initialize drawing canvas size based on image size
    const updateCanvasSize = () => {
        if (imageRef.current && drawingCanvasRef.current) {
            const { width, height } = imageRef.current.getBoundingClientRect();
            drawingCanvasRef.current.width = imageRef.current.naturalWidth;
            drawingCanvasRef.current.height = imageRef.current.naturalHeight;
        }
    };

    useEffect(() => {
        if (image) {
            const timer = setTimeout(updateCanvasSize, 100); // Wait for image to render
            return () => clearTimeout(timer);
        }
    }, [image, zoom]);

    // Coordinate Conversion
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Adjust for zoom and scale
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
    };

    // Drawing Logic (Paint)
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== "paint") return;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = drawingCanvasRef.current?.getContext("2d");
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || mode !== "paint") return;
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const { x, y } = getCoordinates(e);

        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (isEraser) {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = brushColor;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Text Interaction Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== "text") return;
        const { x, y } = getCoordinates(e);

        // Check if clicked near an existing text to select/drag
        const clickedText = [...texts].reverse().find(t => {
            const dist = Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2);
            return dist < t.fontSize * 2; // Rough hit box
        });

        if (clickedText) {
            setSelectedTextId(clickedText.id);
            setIsDraggingText(true);
            setInputText(clickedText.text);
            setTextColor(clickedText.color);
            setTextSize(clickedText.fontSize);
        } else if (inputText) {
            // Place new text
            setTexts([...texts, {
                id: Date.now(),
                text: inputText,
                x: x,
                y: y,
                color: textColor,
                fontSize: textSize
            }]);
            setInputText("");
            setSelectedTextId(null);
        } else {
            setSelectedTextId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDrawing) draw(e);
        if (isDraggingText && selectedTextId !== null) {
            const { x, y } = getCoordinates(e);
            setTexts(texts.map(t => t.id === selectedTextId ? { ...t, x, y } : t));
        }
    };

    const handleMouseUp = () => {
        stopDrawing();
        setIsDraggingText(false);
    };

    const deleteSelectedText = () => {
        if (selectedTextId !== null) {
            setTexts(texts.filter(t => t.id !== selectedTextId));
            setSelectedTextId(null);
            setInputText("");
        }
    };

    const updateSelectedText = () => {
        if (selectedTextId !== null) {
            setTexts(texts.map(t => t.id === selectedTextId ? {
                ...t, text: inputText, color: textColor, fontSize: textSize
            } : t));
        }
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !image) return;

        const img = new Image();
        img.src = image;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.filter = `
                brightness(${filter.brightness}%) contrast(${filter.contrast}%) 
                saturate(${filter.saturate}%) blur(${filter.blur}px) 
                grayscale(${filter.grayscale}%) sepia(${filter.sepia}%) 
                hue-rotate(${filter.hueRotate}deg)
            `;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            const drawingCanvas = drawingCanvasRef.current;
            if (drawingCanvas) {
                ctx.filter = "none";
                ctx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, img.width, img.height);
            }

            texts.forEach(t => {
                ctx.fillStyle = t.color;
                ctx.font = `bold ${t.fontSize}px sans-serif`;
                ctx.textBaseline = "middle";
                ctx.fillText(t.text, t.x, t.y);
            });

            const link = document.createElement("a");
            link.download = "lumina-edited.png";
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
    };

    const filterString = `
        brightness(${filter.brightness}%) contrast(${filter.contrast}%) 
        saturate(${filter.saturate}%) blur(${filter.blur}px) 
        grayscale(${filter.grayscale}%) sepia(${filter.sepia}%) 
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
                        画像選択
                        <input type="file" hidden accept="image/*" onChange={handleUpload} />
                    </label>
                    {image && <button className="button outline" onClick={handleDownload}>保存</button>}
                </div>
            </header>

            <main className="editor-main">
                <section className="preview-area glass">
                    <div className="zoom-controls glass">
                        <span>ズーム: {Math.round(zoom * 100)}%</span>
                        <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
                    </div>
                    {image ? (
                        <div className="viewport" style={{ overflow: 'auto', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                            <div
                                className="image-container"
                                ref={containerRef}
                                style={{
                                    position: 'relative',
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'center center',
                                    transition: 'transform 0.1s ease-out',
                                    margin: 'auto'
                                }}
                            >
                                <img ref={imageRef} src={image} style={{ filter: filterString }} alt="Preview" className="main-preview" />
                                <canvas
                                    ref={drawingCanvasRef}
                                    className="drawing-canvas"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    style={{
                                        position: 'absolute', top: 0, left: 0,
                                        width: '100%', height: '100%',
                                        touchAction: mode === "adjust" ? "auto" : "none",
                                        cursor: mode === "adjust" ? "default" : "crosshair",
                                        pointerEvents: mode === "adjust" ? "none" : "auto"
                                    }}
                                />
                                {texts.map(t => (
                                    <div key={t.id} style={{
                                        position: 'absolute',
                                        left: `${(t.x / (drawingCanvasRef.current?.width || 1)) * 100}%`,
                                        top: `${(t.y / (drawingCanvasRef.current?.height || 1)) * 100}%`,
                                        color: t.color,
                                        fontSize: `${t.fontSize}px`,
                                        pointerEvents: 'none',
                                        transform: 'translate(0, -50%)',
                                        fontWeight: 'bold',
                                        textShadow: '0 0 4px rgba(0,0,0,0.5)',
                                        border: selectedTextId === t.id ? '2px solid var(--primary)' : 'none',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {t.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state"><p>画像をアップロードしてください</p></div>
                    )}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </section>

                <aside className="controls-area glass">
                    {mode === "adjust" && (
                        <>
                            <h3>画像調整</h3>
                            {Object.keys(filter).map((key) => (
                                <div className="control-group" key={key}>
                                    <label>{key} ({filter[key as keyof typeof filter]}{key === 'blur' ? 'px' : '%'})</label>
                                    <input type="range" min="0" max={key === 'blur' ? 20 : 200} value={filter[key as keyof typeof filter]} onChange={(e) => setFilter({ ...filter, [key]: parseInt(e.target.value) })} />
                                </div>
                            ))}
                            <button className="button reset" onClick={() => setFilter({ brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0 })}>リセット</button>
                        </>
                    )}

                    {mode === "paint" && (
                        <>
                            <h3>ペイント</h3>
                            <div className="tool-toggle glass">
                                <button className={!isEraser ? "active" : ""} onClick={() => setIsEraser(false)}>ブラシ</button>
                                <button className={isEraser ? "active" : ""} onClick={() => setIsEraser(true)}>消しゴム</button>
                            </div>
                            <div className="control-group">
                                <label>色</label>
                                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} disabled={isEraser} />
                            </div>
                            <div className="control-group">
                                <label>太さ ({brushSize}px)</label>
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
                            <h3>テキスト</h3>
                            <div className="control-group">
                                <label>{selectedTextId ? "テキスト編集" : "新規テキスト入力"}</label>
                                <input className="text-input glass" type="text" placeholder="文字を入力して画像をクリック" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                            </div>
                            <div className="control-group">
                                <label>色</label>
                                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                            </div>
                            <div className="control-group">
                                <label>サイズ ({textSize}px)</label>
                                <input type="range" min="10" max="200" value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value))} />
                            </div>
                            {selectedTextId ? (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="button primary" style={{ flex: 1 }} onClick={updateSelectedText}>更新</button>
                                    <button className="button reset" style={{ flex: 1, marginTop: 0 }} onClick={deleteSelectedText}>削除</button>
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>※画像上をクリックして配置。配置済みテキストをドラッグで移動、クリックで編集できます。</p>
                            )}
                            <button className="button reset" onClick={() => setTexts([])}>全削除</button>
                        </>
                    )}
                </aside>
            </main>

            <style jsx>{`
                .editor-container { padding: 1rem; min-height: 100vh; display: flex; flex-direction: column; gap: 1rem; max-width: 1400px; margin: 0 auto; }
                .header { padding: 0.8rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
                .mode-switcher { display: flex; padding: 4px; border-radius: 12px; }
                .mode-switcher button { padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; color: var(--text-muted); }
                .mode-switcher button.active { background: var(--primary); color: white; }
                
                .actions { display: flex; gap: 0.8rem; }
                .button { padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem; }
                .button.primary { background: var(--primary); color: white; }
                .button.outline { border: 1px solid var(--primary); color: var(--primary); }
                
                .editor-main { display: grid; grid-template-columns: 1fr 300px; gap: 1rem; flex: 1; min-height: 0; }
                .preview-area { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #111; overflow: hidden; border-radius: 16px; }
                .zoom-controls { position: absolute; top: 1rem; right: 1rem; z-index: 10; padding: 0.5rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; background: rgba(0,0,0,0.6); }
                .viewport { padding: 2rem; }
                .image-container { display: inline-block; background: #000; box-shadow: 0 0 40px rgba(0,0,0,0.8); }
                .main-preview { display: block; max-width: 100%; height: auto; pointer-events: none; }

                .controls-area { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; overflow-y: auto; max-height: 80vh; }
                .control-group { display: flex; flex-direction: column; gap: 0.6rem; }
                .control-group label { font-size: 0.8rem; color: var(--text-muted); text-transform: capitalize; }
                .text-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 0.7rem; border-radius: 8px; color: white; }
                
                .tool-toggle { display: flex; padding: 4px; border-radius: 10px; }
                .tool-toggle button { flex: 1; padding: 0.4rem; border-radius: 6px; font-size: 0.8rem; }
                .tool-toggle button.active { background: rgba(255,255,255,0.1); color: white; }

                .button.reset { border: 1px solid var(--border); color: var(--text-muted); margin-top: 0.5rem; }
                .button.reset:hover { border-color: #ff4d4d; color: #ff4d4d; }

                @media (max-width: 900px) {
                    .editor-main { grid-template-columns: 1fr; }
                    .controls-area { max-height: none; }
                }
            `}</style>
        </div>
    );
};

export default Editor;
