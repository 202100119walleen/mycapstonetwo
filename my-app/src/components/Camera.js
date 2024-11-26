import React, { useState, useRef, useEffect } from 'react';

const Camera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    let stream = null;
    const videoElement = videoRef.current;

    const detectAndStartCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
          setErrorMessage('No camera detected');
          return;
        }

        setCameras(videoDevices);
        setSelectedCamera(videoDevices[0].deviceId);

        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: videoDevices[0].deviceId },
        });

        if (videoElement && stream) {
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setErrorMessage('Unable to access camera');
      }
    };

    detectAndStartCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, []);

  const handleCapture = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageUrl = canvasRef.current.toDataURL('image/png');
      setCapturedImage(imageUrl);
      onCapture(imageUrl); // Pass the image to the parent component
    }
  };

  const handleCameraChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedCamera(deviceId);

    if (videoRef.current && deviceId) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId },
      });
      videoRef.current.srcObject = stream;
    }
  };

  return (
    <div className="camera-container">
      {errorMessage && <p>{errorMessage}</p>}
      <div>
        <label htmlFor="cameraSelect">Choose Camera: </label>
        <select
          id="cameraSelect"
          value={selectedCamera || ''}
          onChange={handleCameraChange}
          disabled={cameras.length <= 1}
        >
          {cameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId}`}
            </option>
          ))}
        </select>
      </div>
      <video
        ref={videoRef}
        style={{
          display: isCameraReady ? 'block' : 'none',
          width: '100%',
          height: 'auto',
        }}
        autoPlay
        muted
      />
      {!isCameraReady && !errorMessage && <p>Loading camera...</p>}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      {isCameraReady && (
        <>
          <button onClick={handleCapture}>Capture</button>
          <button onClick={onClose}>Close</button>
        </>
      )}
      {capturedImage && (
        <div className="preview-container">
          <img src={capturedImage} alt="Captured" style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}
    </div>
  );
};

export default Camera;
