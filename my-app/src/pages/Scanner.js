import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import JsBarcode from 'jsbarcode';

const ScannerPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);

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
        setFilteredItems(fetchedItems); // Initialize filteredItems with all items
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

  // Function to handle search
  const handleSearch = () => {
    const results = items.filter(item =>
      item.uniqueId && item.uniqueId.includes(searchQuery)
    );
    setFilteredItems(results);
  };

  // Function to copy unique ID to clipboard
  const copyToClipboard = (uniqueId) => {
    navigator.clipboard.writeText(uniqueId)
      .then(() => {
        alert(`Copied: ${uniqueId}`);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="scanner-page">
      <h1>Scanner Page</h1>
      {error && <p className="error">{error}</p>}
      
      <input
        type="text"
        placeholder="Search by Unique ID"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button onClick={handleSearch}>Search Unique ID</button>

      {filteredItems.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Unique ID</th>
              <th>Item Name</th>
              <th>Barcode</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>{item.uniqueId || 'N/A'}</td>
                <td>{item.name || 'N/A'}</td>
                <td>
                  <canvas id={`barcode-${item.id}`}></canvas>
                </td>
                <td>
                  <button onClick={() => copyToClipboard(item.uniqueId)}>Copy ID</button>
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