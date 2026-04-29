import { fabric } from 'fabric';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Brush, Eraser, Type,
  Undo2, Redo2, Save, X, Move, Trash2,
  Square, Circle, Minus, ArrowRight
} from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
  onError?: (message: string) => void;
}

type Tool = 'select' | 'brush' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow' | 'text';

const PRESET_COLORS = [
  '#ff0000', '#ff8800', '#ffff00', '#00ff00',
  '#00ffff', '#0088ff', '#8800ff', '#ff00ff',
  '#ffffff', '#cccccc', '#888888', '#000000',
];

function isShapeTool(t: Tool) {
  return t === 'rect' || t === 'circle' || t === 'line' || t === 'arrow';
}

// 创建箭头（使用 Line + Polygon 的组合实现，确保完美对齐）
function createArrow(x1: number, y1: number, x2: number, y2: number, color: string, lw: number): fabric.Group {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 5) {
    // 如果长度太短，返回一个点
    const point = new fabric.Circle({
      left: x1 - lw / 2,
      top: y1 - lw / 2,
      radius: lw / 2,
      fill: color,
      stroke: color,
      strokeWidth: 1,
      selectable: true,
    });
    return new fabric.Group([point], { selectable: true });
  }
  
  const headLength = Math.max(lw * 4, 14);
  const headWidth = headLength * 0.8;
  
  // 计算箭头头部背部的位置（从尖端后退 headLength）
  const backX = x2 - headLength * Math.cos(angle);
  const backY = y2 - headLength * Math.sin(angle);
  
  // 计算垂直方向的角度（与箭头方向垂直）
  const perpAngle = angle + Math.PI / 2;
  
  // 计算箭头头部两侧的端点（从背部中点向两侧延伸）
  const halfWidth = headWidth / 2;
  const backX1 = backX + halfWidth * Math.cos(perpAngle);
  const backY1 = backY + halfWidth * Math.sin(perpAngle);
  const backX2 = backX - halfWidth * Math.cos(perpAngle);
  const backY2 = backY - halfWidth * Math.sin(perpAngle);
  
  // 创建箭身（从起点到箭头背部中心点）
  // 线条稍微延伸超出背部中心，以确保与三角形完美连接
  // 延伸量为线条宽度的一半，这样可以与 round 端点和 round 连接点平滑过渡
  const lineExtension = lw / 2;
  const lineEndX = backX - lineExtension * Math.cos(angle);
  const lineEndY = backY - lineExtension * Math.sin(angle);
  
  const line = new fabric.Line([x1, y1, lineEndX, lineEndY], {
    stroke: color,
    strokeWidth: lw,
    strokeLineCap: 'round',  // 圆形端点
    selectable: true,
  });
  
  // 创建箭头头部（三角形）
  // 三角形的底边中点与 Line 延伸端点重合
  const triangle = new fabric.Polygon([
    { x: backX1, y: backY1 },
    { x: x2, y: y2 },
    { x: backX2, y: backY2 },
  ], {
    fill: color,
    stroke: color,
    strokeWidth: lw,
    strokeLineJoin: 'round',  // 使用 round 连接，确保线条平滑过渡
    selectable: true,
  });
  
  const group = new fabric.Group([line, triangle], {
    selectable: true,
    evented: true,
  });
  
  return group;
}

// 获取直线端点
function getLineEndpoints(line: fabric.Line): { x1: number; y1: number; x2: number; y2: number } {
  return { x1: line.x1 || 0, y1: line.y1 || 0, x2: line.x2 || 0, y2: line.y2 || 0 };
}

// 判断点是否靠近线段
function isPointNearLineSegment(
  pt: { x: number; y: number },
  line: { x1: number; y1: number; x2: number; y2: number },
  tolerance: number
): boolean {
  const { x, y } = pt;
  const { x1, y1, x2, y2 } = line;
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((pt.x - x1) ** 2 + (pt.y - y1) ** 2) <= tolerance;
  let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx, projY = y1 + t * dy;
  return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2) <= tolerance;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onCancel, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<fabric.Image | null>(null);

  // 阻止 fabric.js superdrag bug
  useEffect(() => {
    const handler = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('dragover', handler, true);
    document.addEventListener('drop', handler, true);
    return () => {
      document.removeEventListener('dragover', handler, true);
      document.removeEventListener('drop', handler, true);
    };
  }, []);

  // UI 状态
  const [tool, setTool] = useState<Tool>('select');
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);
  const [fillColor, setFillColor] = useState('');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [fontSize, setFontSize] = useState(24);

  // 选中对象的属性状态
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [selFill, setSelFill] = useState('');
  const [selStroke, setSelStroke] = useState('#ff0000');
  const [selLineWidth, setSelLineWidth] = useState(3);
  const [selOpacity, setSelOpacity] = useState(100);

  // 历史栈
  const historyStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // refs
  const toolRef = useRef<Tool>('select');
  const strokeColorRef = useRef('#ff0000');
  const brushSizeRef = useRef(5);
  const fillColorRef = useRef('');

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { strokeColorRef.current = strokeColor; }, [strokeColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { fillColorRef.current = fillColor; }, [fillColor]);

  // 绘制临时状态
  const isDrawingShape = useRef(false);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const previewShape = useRef<fabric.Object | fabric.Group | null>(null);

  // ── 撤销/恢复：只序列化 objects，不含 backgroundImage ──
  const saveState = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    
    // 安全地序列化 canvas 对象，不影响背景图
    let json: string;
    try {
      // 临时移除背景以序列化
      const bg = fc.backgroundImage;
      fc.backgroundImage = undefined as any;
      json = JSON.stringify(fc.toJSON());
      fc.backgroundImage = bg;
    } catch (err) {
      console.error('保存状态失败:', err);
      return;
    }

    const last = historyStack.current[historyStack.current.length - 1];
    if (last === json) return;
    historyStack.current.push(json);
    redoStack.current = [];
    setCanUndo(historyStack.current.length > 1);
    setCanRedo(false);
  }, []);

  const restoreState = useCallback(async (json: string) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    await fc.loadFromJSON(JSON.parse(json));

    // 恢复背景图（loadFromJSON 不包含它）
    if (bgImageRef.current) {
      fc.backgroundImage = bgImageRef.current;
    }

    fc.renderAll();
  }, []);

  // ── 初始化 ──
  useEffect(() => {
    if (!canvasRef.current) return;

    let isMounted = true;
    let disposePromise: Promise<void> | null = null;

    // 清理旧 canvas
    const oldCanvasEl = canvasRef.current;
    if (fabricCanvasRef.current) {
      disposePromise = new Promise(resolve => {
        fabricCanvasRef.current!.dispose();
        fabricCanvasRef.current = null;
        resolve();
      });
    }
    oldCanvasEl.innerHTML = '';

    // 判断是否为 base64 图片（不需要 CORS）
    const isBase64 = imageUrl.startsWith('data:');
    
    const img = new window.Image();
    if (!isBase64) {
      img.crossOrigin = 'anonymous';
    }
    img.onerror = () => {
      console.error('图片加载失败');
      onError?.('图片加载失败，请检查图片格式是否正确');
      setTimeout(() => onCancel(), 100);
    };
    img.onload = async () => {
      if (!isMounted) return;
      // 等待之前的 dispose 完成
      if (disposePromise) await disposePromise;
      if (!isMounted || !canvasRef.current) return;

      try {
        // 使用 fabric.util.loadImage 加载图片（兼容 fabric.js v5.x）
        // loadImage 接受回调函数作为第二个参数
        const fabricImageEl = await new Promise<HTMLImageElement>((resolve, reject) => {
          fabric.util.loadImage(imageUrl, (img: HTMLImageElement | HTMLCanvasElement) => {
            if (!img) {
              reject(new Error('图片加载失败'));
            } else {
              // 设置 crossOrigin 属性（用于跨域图片）
              if (!isBase64 && img instanceof HTMLImageElement) {
                img.crossOrigin = 'anonymous';
              }
              resolve(img as HTMLImageElement);
            }
          });
        });
        
        if (!isMounted) return;
        
        const bgImg = new fabric.Image(fabricImageEl);
        
        // 获取图片原始尺寸（使用 naturalWidth/naturalHeight 确保正确）
        const imgWidth = img.naturalWidth || img.width || bgImg.width || 1;
        const imgHeight = img.naturalHeight || img.height || bgImg.height || 1;

        // 验证尺寸有效性
        if (imgWidth < 1 || imgHeight < 1) {
          console.warn('图片尺寸无效');
          onError?.('图片尺寸无效，无法加载');
          // 自动关闭编辑器
          setTimeout(() => onCancel(), 100);
          return;
        }

        // 计算容器可用空间（减去 padding）
        const container = containerRef.current;
        const maxWidth = container ? container.clientWidth - 20 : 800;
        const maxHeight = container ? container.clientHeight - 20 : 600;

        // 计算缩放比例，确保图片完整显示且不变形
        const scale = Math.min(1, Math.min(maxWidth / imgWidth, maxHeight / imgHeight));
        const displayWidth = Math.round(imgWidth * scale);
        const displayHeight = Math.round(imgHeight * scale);

        // 设置画布显示尺寸（缩放后的）
        const fc = new fabric.Canvas(canvasRef.current, {
          width: displayWidth,
          height: displayHeight,
          preserveObjectStacking: true,
        });
        fabricCanvasRef.current = fc;
        fabric.Object.prototype.strokeUniform = true;

        // 设置背景图，使用原始图片的缩放版本
        bgImg.set({
          selectable: false,
          evented: false,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
        });
        fc.backgroundImage = bgImg;
        bgImageRef.current = bgImg;
        fc.renderAll();
        saveState();

        // 选择事件
        fc.on('selection:created', (e: any) => {
          const obj = e.selected?.[0];
          if (obj) syncSelectionUI(obj);
        });
        fc.on('selection:updated', (e: any) => {
          const obj = e.selected?.[0];
          if (obj) syncSelectionUI(obj);
        });
        fc.on('selection:cleared', () => {
          setSelectedObject(null);
        });
        fc.on('object:modified', () => {
          saveState();
        });
        fc.on('path:created', () => saveState());

        // 鼠标事件
        fc.on('mouse:down', (e: any) => {
          const t = toolRef.current;
          // 处理橡皮擦（点击对象删除）
          if (t === 'eraser') {
            handleEraserPointer(e);
            return;
          }
          // 处理形状绘制
          if (isShapeTool(t)) {
            onMouseDown(e);
          }
        });

        fc.on('mouse:move', (e: any) => {
          // 处理形状绘制
          if (isShapeTool(toolRef.current)) {
            onMouseMove(e);
          }
        });

        fc.on('mouse:up', (e: any) => {
          if (isShapeTool(toolRef.current)) {
            onMouseUp(e);
          }
        });
      } catch (err) {
        console.error('FabricImage 加载失败:', err);
        onError?.('图片加载失败，可能是跨域问题或图片格式不支持');
        setTimeout(() => onCancel(), 100);
      }
    };
    img.src = imageUrl;

    return () => {
      isMounted = false;
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
      }
    };
  }, [imageUrl]);

  function syncSelectionUI(obj: fabric.Object) {
    setSelectedObject(obj);
    const fill = typeof obj.fill === 'string' ? obj.fill : '';
    setSelFill(fill === 'transparent' ? '' : fill);
    setSelStroke(typeof obj.stroke === 'string' ? obj.stroke : '#ff0000');
    setSelLineWidth(obj.strokeWidth ?? 3);
    setSelOpacity(Math.round((obj.opacity ?? 1) * 100));
  }

  // ── Canvas 图形绘制事件（读 ref，不读 state） ──
  function onMouseDown(e: any) {
    const t = toolRef.current;
    if (!isShapeTool(t)) return;
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    // 确保 e.e.target 存在，避免 dom_event.ts 错误
    if (!e.e?.target) return;
    // 如果点到了已有对象（非背景图），让 Fabric 默认处理（选中）
    if (e.target && e.target !== fc.backgroundImage) return;

    const pt = fc.getPointer(e.e);
    isDrawingShape.current = true;
    startPt.current = { x: pt.x, y: pt.y };

    const color = strokeColorRef.current;
    const lw = brushSizeRef.current;
    const fill = fillColorRef.current || 'transparent';

    let shape: fabric.Object | fabric.Group;
    if (t === 'rect') {
      shape = new fabric.Rect({
        left: pt.x, top: pt.y, width: 0, height: 0,
        fill, stroke: color, strokeWidth: lw,
        selectable: false, evented: false,
      });
    } else if (t === 'circle') {
      shape = new fabric.Ellipse({
        left: pt.x, top: pt.y, rx: 0, ry: 0,
        fill, stroke: color, strokeWidth: lw,
        selectable: false, evented: false,
      });
    } else if (t === 'line') {
      shape = new fabric.Line([pt.x, pt.y, pt.x, pt.y], {
        stroke: color, strokeWidth: lw,
        selectable: false, evented: false, strokeLineCap: 'round',
      });
    } else {
      // 优化：先创建临时线条，在鼠标移动时更新，只在结束时创建完整箭头
      shape = new fabric.Line([pt.x, pt.y, pt.x, pt.y], {
        stroke: color, strokeWidth: lw,
        selectable: false, evented: false, strokeLineCap: 'round',
      });
    }

    fc.add(shape);
    previewShape.current = shape;
    fc.renderAll();
  }

  function onMouseMove(e: any) {
    if (!isDrawingShape.current || !startPt.current) return;
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const t = toolRef.current;
    const pt = fc.getPointer(e.e);
    const { x: sx, y: sy } = startPt.current;
    const shape = previewShape.current;
    if (!shape) return;

    if (t === 'rect') {
      const r = shape as fabric.Rect;
      r.set({
        left: Math.min(sx, pt.x), top: Math.min(sy, pt.y),
        width: Math.abs(pt.x - sx), height: Math.abs(pt.y - sy),
      });
      r.setCoords();
    } else if (t === 'circle') {
      const el = shape as fabric.Ellipse;
      el.set({
        left: Math.min(sx, pt.x), top: Math.min(sy, pt.y),
        rx: Math.abs(pt.x - sx) / 2, ry: Math.abs(pt.y - sy) / 2,
      });
      el.setCoords();
    } else if (t === 'line') {
      const ln = shape as fabric.Line;
      ln.set({ x2: pt.x, y2: pt.y });
      ln.setCoords();
    } else if (t === 'arrow') {
      // 箭头工具：使用临时线条预览
      if (shape instanceof fabric.Line) {
        // 更新线条
        shape.set({ x2: pt.x, y2: pt.y });
        shape.setCoords();
      } else if (shape instanceof fabric.Group) {
        // 如果已经是 Group（完整箭头），删除并创建新的
        fc.remove(shape);
        const arrow = createArrow(sx, sy, pt.x, pt.y, strokeColorRef.current, brushSizeRef.current);
        arrow.set({ selectable: false, evented: false });
        fc.add(arrow);
        previewShape.current = arrow;
      }
    }
    fc.renderAll();
  }

  function onMouseUp(_e: any) {
    if (!isDrawingShape.current) return;
    const fc = fabricCanvasRef.current;
    isDrawingShape.current = false;
    startPt.current = null;
    let shape = previewShape.current;
    previewShape.current = null;
    if (!fc || !shape) return;

    // 移除过小的误点图形
    let tiny = false;
    if (shape instanceof fabric.Rect) tiny = (shape.width ?? 0) < 4 && (shape.height ?? 0) < 4;
    else if (shape instanceof fabric.Ellipse) tiny = (shape.rx ?? 0) < 2 && (shape.ry ?? 0) < 2;
    else if (shape instanceof fabric.Line) {
      const dx = (shape.x2 ?? 0) - (shape.x1 ?? 0);
      const dy = (shape.y2 ?? 0) - (shape.y1 ?? 0);
      tiny = Math.sqrt(dx * dx + dy * dy) < 5;
    } else if (shape instanceof fabric.Group) {
      // 检查 Group 的边界框
      const bounds = shape.getBoundingRect();
      tiny = bounds.width < 5 && bounds.height < 5;
    }

    if (tiny) { fc.remove(shape); fc.renderAll(); return; }

    // 如果是箭头工具的临时线条，转换为完整箭头
    const t = toolRef.current;
    if (t === 'arrow' && shape instanceof fabric.Line) {
      const x1 = shape.x1 ?? 0;
      const y1 = shape.y1 ?? 0;
      const x2 = shape.x2 ?? 0;
      const y2 = shape.y2 ?? 0;
      fc.remove(shape); // 移除临时线条
      
      // 创建完整箭头
      shape = createArrow(x1, y1, x2, y2, strokeColorRef.current, brushSizeRef.current);
      shape.set({ selectable: true, evented: true });
      fc.add(shape);
    } else {
      shape.set({ selectable: true, evented: true });
    }

    fc.setActiveObject(shape);
    fc.renderAll();
    saveState();
  }

  // ── 橡皮擦：使用 findTarget 精确检测点击对象 ──
  const handleEraserPointer = useCallback((e: any) => {
    if (toolRef.current !== 'eraser') return;
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const target = fc.findTarget(e.e);
    if (target && target !== fc.backgroundImage) {
      fc.remove(target);
      fc.renderAll();
      // 使用 saveState 函数，它包含错误处理
      saveState();
    }
  }, [saveState]);

  // ── 工具切换 ──
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    if (tool === 'brush') {
      fc.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fc);
      brush.color = brushColor;
      brush.width = brushSize;
      fc.freeDrawingBrush = brush;
      fc.defaultCursor = 'crosshair';
    } else if (tool === 'eraser') {
      fc.isDrawingMode = false;
      // 橡皮擦使用自定义 SVG 光标
      const svgCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='3' y='14' width='18' height='7' rx='1' fill='%23e74c3c' stroke='%23c0392b' stroke-width='1'/%3E%3Crect x='6' y='7' width='12' height='10' rx='1' fill='%23f5f5f5' stroke='%23ddd' stroke-width='1'/%3E%3Crect x='7' y='8' width='4' height='2' fill='%23f5f5f5'/%3E%3C/svg%3E") 12 20, auto`;
      fc.defaultCursor = svgCursor;
      fc.hoverCursor = svgCursor;
    } else {
      fc.isDrawingMode = false;
      fc.defaultCursor = isShapeTool(tool) ? 'crosshair' : (tool === 'text' ? 'text' : 'default');
    }

    const selectable = tool === 'select';
    fc.forEachObject((obj: fabric.Object) => {
      obj.selectable = selectable;
      obj.evented = selectable || tool === 'eraser';
      obj.hoverCursor = selectable ? 'move' : (isShapeTool(tool) ? 'crosshair' : (tool === 'eraser' ? 'pointer' : 'default'));
    });

    if (!selectable) fc.discardActiveObject();
    fc.selection = selectable;
    fc.renderAll();
  }, [tool, brushColor, brushSize]);

  // ── 修改选中对象属性 ──
  const applyToSelected = (props: Record<string, any>) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    obj.set(props);
    fc.renderAll();
    saveState();
  };

  // ── 添加文字 ──
  const addText = (e: React.MouseEvent) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const canvasEl = fc.getElement();
    const canvasRect = canvasEl.getBoundingClientRect();

    // 使用 getPointer 获取相对于 canvas 的坐标
    // 这会自动考虑 canvas 的位置和缩放
    const pointer = fc.getPointer(e.nativeEvent);
    const x = pointer.x;
    const y = pointer.y;

    // 验证点击位置在 canvas 范围内
    if (x < 0 || x > fc.width || y < 0 || y > fc.height) return;

    const text = new fabric.IText('新文字', {
      left: x,
      top: y,
      fontFamily: 'sans-serif',
      fontSize,
      fill: brushColor,
      selectable: true,
      editable: true,
    });
    fc.add(text);
    fc.setActiveObject(text);
    fc.renderAll();
    saveState();
  };

  // ── 删除选中 ──
  const handleDeleteSelected = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) {
      fc.remove(obj);
      fc.discardActiveObject();
      fc.renderAll();
      setSelectedObject(null);
      saveState();
    }
  }, [saveState]);

  // ── 撤销 ──
  const handleUndo = useCallback(async () => {
    if (historyStack.current.length <= 1) return;
    const cur = historyStack.current.pop()!;
    redoStack.current.push(cur);
    await restoreState(historyStack.current[historyStack.current.length - 1]);
    setCanUndo(historyStack.current.length > 1);
    setCanRedo(true);
    setSelectedObject(null);
  }, [restoreState]);

  // ── 重做 ──
  const handleRedo = useCallback(async () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    historyStack.current.push(next);
    await restoreState(next);
    setCanUndo(historyStack.current.length > 1);
    setCanRedo(redoStack.current.length > 0);
    setSelectedObject(null);
  }, [restoreState]);

  // ── 导出 ──
  const handleSave = () => {
    const fc = fabricCanvasRef.current;
    const bgImg = bgImageRef.current;
    if (!fc) return;

    // 获取背景图原始尺寸
    const imgWidth = bgImg?.width || fc.width || 800;
    const imgHeight = bgImg?.height || fc.height || 600;

    // 计算放大倍数：如果显示尺寸被缩放了，需要放大回原始尺寸
    const multiplier = fc.width && imgWidth ? imgWidth / fc.width : 1;

    const dataURL = fc.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier,
    });
    onSave(dataURL);
  };

  // ── 键盘快捷键 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fc = fabricCanvasRef.current;
      const target = e.target as HTMLElement;

      // 如果在输入框中，不处理快捷键
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Ctrl+Z / Ctrl+Shift+Z: 撤销/重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }

      // Ctrl+Y: 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+S: 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Escape: 取消选择 / 关闭编辑器
      if (e.key === 'Escape') {
        if (isDrawingShape.current) {
          // 取消当前绘制
          isDrawingShape.current = false;
          if (previewShape.current) {
            fc?.remove(previewShape.current);
            previewShape.current = null;
            fc?.renderAll();
          }
        } else {
          fc?.discardActiveObject();
          fc?.renderAll();
        }
        return;
      }

      // Delete/Backspace: 删除选中对象
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const obj = fc?.getActiveObject();
        if (obj && !(obj.type === 'i-text' && (obj as any).isEditing)) {
          handleDeleteSelected();
        }
        return;
      }

      // 工具快捷键 1-8
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const toolMap: Record<string, Tool> = {
          '1': 'select',
          '2': 'brush',
          '3': 'eraser',
          '4': 'text',
          '5': 'rect',
          '6': 'circle',
          '7': 'line',
          '8': 'arrow',
        };
        const newTool = toolMap[e.key];
        if (newTool) {
          setTool(newTool);
          return;
        }
      }

      // 方向键: 微调选中对象位置
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const obj = fc?.getActiveObject();
        if (obj && obj.selectable) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          obj.set({
            left: (obj.left || 0) + dx,
            top: (obj.top || 0) + dy,
          });
          obj.setCoords();
          fc?.renderAll();
        }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo, handleDeleteSelected, handleSave]);

  // ── 工具按钮列表 ──
  const toolBtns: { id: Tool; icon: React.ReactNode; title: string; key: string }[] = [
    { id: 'select', icon: <Move className="w-5 h-5" />, title: '选择/移动', key: '1' },
    { id: 'brush', icon: <Brush className="w-5 h-5" />, title: '画笔', key: '2' },
    { id: 'eraser', icon: <Eraser className="w-5 h-5" />, title: '橡皮擦', key: '3' },
    { id: 'text', icon: <Type className="w-5 h-5" />, title: '文字', key: '4' },
    { id: 'rect', icon: <Square className="w-5 h-5" />, title: '矩形', key: '5' },
    { id: 'circle', icon: <Circle className="w-5 h-5" />, title: '圆形/椭圆', key: '6' },
    { id: 'line', icon: <Minus className="w-5 h-5" />, title: '直线', key: '7' },
    { id: 'arrow', icon: <ArrowRight className="w-5 h-5" />, title: '箭头', key: '8' },
  ];

  const showFillPanel = isShapeTool(tool) ||
    (selectedObject && selectedObject.type !== 'path' && selectedObject.type !== 'i-text');
  const activeStroke = selectedObject ? selStroke : (tool === 'brush' ? brushColor : strokeColor);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="bg-[#1c1f26] rounded-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e38]">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-bold">图片编辑器</h2>
            <span className="text-slate-500 text-xs">
              {tool === 'text' ? '点击画布添加文字'
                : tool === 'eraser' ? '点击对象删除（不影响底图）'
                : isShapeTool(tool) ? '拖拽绘制图形，松开确认'
                : '选择工具: 方向键微调 | Del删除 | Ctrl+Z撤销 | Ctrl+S保存'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2e38] hover:bg-[#3a3e48] text-white text-sm rounded-lg transition-colors">
              <X className="w-4 h-4" />取消
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
              <Save className="w-4 h-4" />保存
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-16 bg-[#111317] border-r border-[#2a2e38] flex flex-col items-center py-4 gap-1">
            {toolBtns.map(({ id, icon, title, key }) => (
              <button key={id} onClick={() => setTool(id)} title={`${title} (${key})`}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative ${tool === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-[#2a2e38] hover:text-white'}`}>
                {icon}
                <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-50">{key}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={handleUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)"
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-slate-400 hover:bg-[#2a2e38] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <Undo2 className="w-5 h-5" />
            </button>
            <button onClick={handleRedo} disabled={!canRedo} title="重做 (Ctrl+Shift+Z)"
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-slate-400 hover:bg-[#2a2e38] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas */}
          <div ref={containerRef}
            className="flex-1 relative bg-[#111317] overflow-hidden flex items-center justify-center"
            onClick={(e) => { if (tool === 'text') addText(e); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}>
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
          </div>

          {/* Right Panel */}
          <div className="w-60 bg-[#111317] border-l border-[#2a2e38] p-4 overflow-y-auto custom-scrollbar flex flex-col gap-5">

            {/* 描边/画笔颜色 */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {tool === 'brush' ? '画笔颜色' : '描边颜色'}
              </p>
              <div className="grid grid-cols-6 gap-1.5 mb-2">
                {PRESET_COLORS.map(c => (
                  <button key={c}
                    onClick={() => {
                      if (selectedObject) { setSelStroke(c); applyToSelected({ stroke: c }); }
                      else { setStrokeColor(c); setBrushColor(c); }
                    }}
                    className={`w-6 h-6 rounded border-2 transition-all ${activeStroke === c ? 'border-white scale-110' : 'border-transparent hover:border-slate-500'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={activeStroke || '#ff0000'}
                  onChange={e => {
                    const v = e.target.value;
                    if (selectedObject) { setSelStroke(v); applyToSelected({ stroke: v }); }
                    else { setStrokeColor(v); setBrushColor(v); }
                  }}
                  className="w-8 h-7 rounded cursor-pointer" />
                <input type="text" value={activeStroke}
                  onChange={e => {
                    const v = e.target.value;
                    if (selectedObject) { setSelStroke(v); applyToSelected({ stroke: v }); }
                    else { setStrokeColor(v); setBrushColor(v); }
                  }}
                  className="flex-1 bg-[#1c1f26] border border-[#2a2e38] rounded px-2 py-1 text-white text-xs outline-none focus:border-indigo-500" />
              </div>
            </div>

            {/* 填充颜色（图形工具或选中非画笔非文字对象） */}
            {showFillPanel && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">填充颜色</p>
                <button
                  onClick={() => {
                    if (selectedObject) { setSelFill(''); applyToSelected({ fill: 'transparent' }); }
                    else setFillColor('');
                  }}
                  className={`mb-2 px-2 py-0.5 text-xs rounded border transition-colors ${(selectedObject ? selFill : fillColor) === '' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1c1f26] border-[#2a2e38] text-slate-400 hover:text-white'}`}>
                  无填充
                </button>
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c}
                      onClick={() => {
                        if (selectedObject) { setSelFill(c); applyToSelected({ fill: c }); }
                        else setFillColor(c);
                      }}
                      className={`w-6 h-6 rounded border-2 transition-all ${(selectedObject ? selFill : fillColor) === c ? 'border-white scale-110' : 'border-transparent hover:border-slate-500'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <input type="color" value={(selectedObject ? selFill : fillColor) || '#000000'}
                  onChange={e => {
                    const v = e.target.value;
                    if (selectedObject) { setSelFill(v); applyToSelected({ fill: v }); }
                    else setFillColor(v);
                  }}
                  className="w-8 h-7 rounded cursor-pointer" />
              </div>
            )}

            {/* 线条粗细 */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                线条粗细: {selectedObject ? selLineWidth : brushSize}px
              </p>
              <input type="range" min="1" max="50"
                value={selectedObject ? selLineWidth : brushSize}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (selectedObject) { setSelLineWidth(v); applyToSelected({ strokeWidth: v }); }
                  else setBrushSize(v);
                }}
                className="w-full h-2 bg-[#2a2e38] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <div className="flex justify-between text-slate-500 text-[10px] mt-1"><span>细</span><span>粗</span></div>
            </div>

            {/* 不透明度 */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                不透明度: {selectedObject ? selOpacity : 100}%
              </p>
              <input type="range" min="10" max="100"
                value={selectedObject ? selOpacity : 100}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (selectedObject) { setSelOpacity(v); applyToSelected({ opacity: v / 100 }); }
                }}
                className="w-full h-2 bg-[#2a2e38] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            {/* 字体大小 */}
            {tool === 'text' && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">字体大小: {fontSize}px</p>
                <input type="range" min="10" max="120" value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="w-full h-2 bg-[#2a2e38] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
            )}

            {/* 画笔预览 */}
            {(tool === 'brush' || tool === 'eraser') && !selectedObject && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">预览</p>
                <div className="w-full aspect-square rounded-lg border border-[#2a2e38] flex items-center justify-center bg-[#1c1f26]">
                  <div className="rounded-full" style={{
                    width: Math.min(brushSize * 2, 80),
                    height: Math.min(brushSize * 2, 80),
                    backgroundColor: tool === 'eraser' ? '#aaaaaa' : brushColor,
                  }} />
                </div>
              </div>
            )}

            <div className="flex-1" />

            {/* 删除 */}
            <button onClick={handleDeleteSelected}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />删除选中
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
