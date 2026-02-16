"use strict";

import { useEffect, useRef, useState } from "react";

const Editor = () => {
    const [image, setImage] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [filter, setFilter] = useState({
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
    });

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result as string);
                // Reset filters on new upload
                setFilter({
                    brightness: 100,
                    contrast: 100,
                    saturate: 100,
                    blur: 0,
                    grayscale: 0,
                    sepia: 0,
                    hueRotate: 0,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const applyFiltersToCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !image) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = image;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
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
        };
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Ensure the canvas is updated with current filters before downloading
        const ctx = canvas.getContext("2d");
        if (!ctx || !image) return;

        const img = new Image();
        img.src = image;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
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
                <div className="actions">
                    <label className="button primary">
                        画像をアップロード
                        <input type="file" hidden accept="image/*" onChange={handleUpload} />
                    </label>
                    {image && (
                        <button className="button outline" onClick={handleDownload}>
                            保存する
                        </button>
                    )}
                </div>
            </header>

            <main className="editor-main">
                <section className="preview-area glass">
                    {image ? (
                        <div className="image-wrapper">
                            <img src={image} style={{ filter: filterString }} alt="Preview" />
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>画像をアップロードして編集を開始してください</p>
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </section>

                <aside className="controls-area glass">
                    <h3>調整</h3>
                    <div className="control-group">
                        <label>明るさ ({filter.brightness}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={filter.brightness}
                            onChange={(e) => setFilter({ ...filter, brightness: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="control-group">
                        <label>コントラスト ({filter.contrast}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={filter.contrast}
                            onChange={(e) => setFilter({ ...filter, contrast: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="control-group">
                        <label>彩度 ({filter.saturate}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={filter.saturate}
                            onChange={(e) => setFilter({ ...filter, saturate: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="control-group">
                        <label>ぼかし ({filter.blur}px)</label>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            value={filter.blur}
                            onChange={(e) => setFilter({ ...filter, blur: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="control-group">
                        <label>グレースケール ({filter.grayscale}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filter.grayscale}
                            onChange={(e) => setFilter({ ...filter, grayscale: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="control-group">
                        <label>セピア ({filter.sepia}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filter.sepia}
                            onChange={(e) => setFilter({ ...filter, sepia: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="control-group">
                        <label>色相 ({filter.hueRotate}deg)</label>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={filter.hueRotate}
                            onChange={(e) => setFilter({ ...filter, hueRotate: parseInt(e.target.value) })}
                        />
                    </div>
                    <button className="button reset" onClick={() => setFilter({
                        brightness: 100,
                        contrast: 100,
                        saturate: 100,
                        blur: 0,
                        grayscale: 0,
                        sepia: 0,
                        hueRotate: 0,
                    })}>
                        リセット
                    </button>
                </aside>
            </main>

            <style jsx>{`
                .editor-container {
                    padding: 2rem;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .header {
                    padding: 1.5rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header h1 {
                    font-size: 1.8rem;
                    font-weight: 800;
                    margin: 0;
                }
                .actions {
                    display: flex;
                    gap: 1rem;
                }
                .button {
                    padding: 0.8rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 600;
                    transition: var(--transition);
                }
                .button.primary {
                    background: var(--primary);
                    color: white;
                }
                .button.primary:hover {
                    background: var(--primary-hover);
                    box-shadow: 0 0 20px rgba(157, 0, 255, 0.4);
                }
                .button.outline {
                    border: 1px solid var(--primary);
                    color: var(--primary);
                }
                .button.outline:hover {
                    background: rgba(157, 0, 255, 0.1);
                }
                .editor-main {
                    display: grid;
                    grid-template-columns: 1fr 320px;
                    gap: 2rem;
                    flex: 1;
                }
                .preview-area {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    min-height: 400px;
                    padding: 2rem;
                }
                .image-wrapper {
                    max-width: 100%;
                    max-height: 100%;
                    display: flex;
                    justify-content: center;
                }
                .image-wrapper img {
                    max-width: 100%;
                    max-height: 70vh;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .empty-state {
                    color: var(--text-muted);
                    text-align: center;
                }
                .controls-area {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .controls-area h3 {
                    margin-bottom: 0.5rem;
                    font-size: 1.2rem;
                    background: linear-gradient(135deg, #fff 0%, #aaa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }
                .control-group label {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                .button.reset {
                    margin-top: 1rem;
                    border: 1px solid var(--border);
                    color: var(--text-muted);
                }
                .button.reset:hover {
                    border-color: #ff4d4d;
                    color: #ff4d4d;
                    background: rgba(255, 77, 77, 0.1);
                }

                @media (max-width: 900px) {
                    .editor-main {
                        grid-template-columns: 1fr;
                    }
                    .controls-area {
                        order: 2;
                    }
                    .preview-area {
                        order: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default Editor;
