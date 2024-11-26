// Barcode.js
import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import './Barcode.css'; // Add this line if you have specific styles for the Barcode component

const Barcode = ({ value }) => {
  const svgRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [barcodeImage, setBarcodeImage] = useState("");

  useEffect(() => {
    if (svgRef.current) {
      // Generate the barcode using JsBarcode
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 50,
        displayValue: false,
        background: "#fff",
        textAlign: "center",
        textPosition: "bottom",
      });

      // Generate the barcode image URL from the SVG
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        setBarcodeImage(canvas.toDataURL());
      };
      img.src = url;
    }
  }, [value]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div>
      <svg ref={svgRef} onClick={handleFullscreen} style={{ cursor: 'pointer' }}></svg>
      {isFullscreen && (
        <div className="fullscreen-modal" onClick={handleFullscreen}>
          <img src={barcodeImage} alt="Barcode" className="fullscreen-image" />
        </div>
      )}
    </div>
  );
};

export default Barcode;
