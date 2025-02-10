import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";

const TAMANO = 100;

const ImageClassifier: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modelo, setModelo] = useState<tf.LayersModel | null>(null);
  const [resultado, setResultado] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const cargarModelo = async () => {
      try {
        const modeloCargado = await tf.loadLayersModel("/model/model.json");
        setModelo(modeloCargado);
        console.log("Modelo cargado correctamente");
      } catch (error) {
        console.error("Error al cargar el modelo:", error);
      }
    };
    cargarModelo();
  }, []);

  const iniciarCamara = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 400, height: 400 },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("No se pudo utilizar la cámara:", err);
    }
  };

  const tomarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, TAMANO, TAMANO);
      predecir();
    }
  };

  const manejarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      procesarArchivo(e.target.files[0]);
    }
  };

  const manejarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarArchivo(e.dataTransfer.files[0]);
    }
  };

  const procesarArchivo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (canvasRef.current && typeof reader.result === "string") {
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, TAMANO, TAMANO);
          predecir();
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const predecir = () => {
    if (!modelo || !canvasRef.current || !miniCanvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const miniCtx = miniCanvasRef.current.getContext("2d");
    if (!ctx || !miniCtx) return;

    miniCtx.drawImage(canvasRef.current, 0, 0, 100, 100);

    const imgData = miniCtx.getImageData(0, 0, TAMANO, TAMANO);
    const arr: number[][][] = [];
    let fila: number[][] = [];

    for (let p = 0; p < imgData.data.length; p += 4) {
      const r = imgData.data[p] / 255;
      const g = imgData.data[p + 1] / 255;
      const b = imgData.data[p + 2] / 255;
      const gris = (r + g + b) / 3;
      fila.push([gris]);
      if (fila.length === TAMANO) {
        arr.push(fila);
        fila = [];
      }
    }

    const tensor = tf.tensor4d([arr]);
    const prediccion = modelo.predict(tensor) as tf.Tensor;
    const valor = prediccion.dataSync()[0];
    setResultado(valor <= 0.5 ? "Gato" : "Perro");
    tensor.dispose();
    prediccion.dispose();
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Clasificador Animal</h1>
      <div
        style={{
          border: "2px dashed #aaa",
          borderRadius: "10px",
          padding: "20px",
          margin: "20px auto",
          maxWidth: "500px",
          cursor: "pointer",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={manejarDrop}
      >
        Arrastra una imagen aquí o selecciona un archivo
        <input
          type="file"
          accept="image/*"
          onChange={manejarArchivo}
          style={{ display: "block", marginTop: "10px" }}
        />
      </div>
      <div>
        <button
          onClick={iniciarCamara}
          style={{ padding: "10px 20px", margin: "10px" }}
        >
          Activar Cámara
        </button>
        <button
          onClick={tomarFoto}
          style={{ padding: "10px 20px", margin: "10px" }}
        >
          Tomar Foto
        </button>
      </div>
      <video
        ref={videoRef}
        width="400"
        height="400"
        style={{
          display: stream ? "block" : "none",
          margin: "20px auto",
          background: "#000",
        }}
      />
      <canvas
        ref={canvasRef}
        width={TAMANO}
        height={TAMANO}
        style={{ display: "none" }}
      />
      <canvas
        ref={miniCanvasRef}
        width={TAMANO}
        height={TAMANO}
        style={{ display: "none" }}
      />
      {resultado && <h2>Resultado: {resultado}</h2>}
    </div>
  );
};

export default ImageClassifier;
