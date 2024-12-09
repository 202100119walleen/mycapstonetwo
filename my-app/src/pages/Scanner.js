import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import JsBarcode from 'jsbarcode';

const ScannerPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(
      requestCollection,
      (snapshot) => {
        const fetchedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(fetchedItems);
        setError(null); // Clear any previous errors
      },
      (error) => {
        console.error("Error fetching items:", error);
        setError("Failed to fetch items. Please try again later.");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Generate barcodes after items are fetched
    items.forEach((item) => {
      JsBarcode(`#barcode-${item.id}`, item.uniqueId, {
        format: 'CODE128',
        displayValue: true,
      });
    });
  }, [items]);

  return (
    <div className="scanner-page">
      <h1>Scanner Page</h1>
      {error && <p className="error">{error}</p>}
      {items.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Unique ID</th>
              <th>Item Name</th>
              <th>Barcode</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.uniqueId || 'N/A'}</td> {/* Ensure uniqueId is rendered correctly */}
                <td>{item.name || 'N/A'}</td> {/* Ensure name is rendered correctly */}
                <td>
                  <canvas id={`barcode-${item.id}`}></canvas>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No items available.</p>
      )}
    </div>
  );
};

export default ScannerPage;