import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config'; // Adjust the import based on your project structure
import { storage } from '../firebase/firebase-config'; // Import your Firebase storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import necessary functions from Firebase storage
import './ManageItem.css'; // Optional: Add your styles here

const ManageItem = () => {
  const [items, setItems] = useState([]);
  const [dateDelivered, setDateDelivered] = useState({}); // To store date delivered for each item
  const [imageFiles, setImageFiles] = useState({}); // To store image files for each item

  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(fetchedItems);
    });
    return () => unsubscribe();
  }, []);

  // Flatten the items to display individual item names with their purchased quantities
  const flattenedItems = items.flatMap((request) =>
    request.itemName.map((item) => ({
      uniqueId: request.uniqueId,
      itemName: item.name,
      purchasedQuantity: request.quantity || 0, // Changed to purchasedQuantity
      supplierName: request.supplierName,
      category: request.category,
      college: request.college || 'N/A', // Default to 'N/A' if not available
      department: request.department || 'N/A', // Default to 'N/A' if not available
      program: request.program || 'N/A', // Default to 'N/A' if not available
      requestDate: new Date(request.requestDate).toLocaleDateString(),
      requestPurpose: request.requestPurpose || 'N/A', // Default to 'N/A' if not available
      specificType: request.specificType || 'N/A', // Default to 'N/A' if not available
      requestId: request.id, // Keep track of the request ID for actions
    }))
  );

  const handleDateChange = (id, date) => {
    setDateDelivered((prev) => ({ ...prev, [id]: date }));
  };

  const handleImageChange = (id, file) => {
    setImageFiles((prev) => ({ ...prev, [id]: file }));
  };

  const handleUpdate = async (id) => {
    const requestRef = doc(db, 'requests', id);
    let imageUrl = null;

    // Handle image upload if a file is selected
    if (imageFiles[id]) {
      const storageRef = ref(storage, `images/${imageFiles[id].name}`);
      await uploadBytes(storageRef, imageFiles[id]);
      imageUrl = await getDownloadURL(storageRef);
    }

    await updateDoc(requestRef, {
      dateDelivered: dateDelivered[id] || null,
      image: imageUrl || null, // Store the image URL in Firestore
    });

    // Reset the state after update
    setDateDelivered((prev) => ({ ...prev, [id]: '' }));
    setImageFiles((prev) => ({ ...prev, [id]: null }));
  };

  const handleDelete = async (id) => {
    const requestRef = doc(db, 'requests', id);
    await deleteDoc(requestRef);
  };

  return (
    <div className="manage-item">
      <h1>Manage Item</h1>
      {flattenedItems.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Unique ID</th>
              <th>Item Name</th>
              <th>Purchased Quantity</th>
              <th>Supplier Name</th>
              <th>Category</th>
              <th>College</th>
              <th>Department</th>
              <th>Program</th>
              <th>Request Date</th>
              <th>Request Purpose</th>
              <th>Specific Type</th>
              <th>Date Delivered</th>
              <th>Image Upload</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flattenedItems.map((item) => (
              <tr key={item.uniqueId}>
                <td>{item.uniqueId}</td>
                <td>{item.itemName}</td>
                <td>{item.purchasedQuantity}</td>
                <td>{item.supplierName}</td>
                <td>{item.category}</td>
                <td>{item.college}</td>
                <td>{item.department}</td>
                <td>{item.program}</td>
                <td>{item.requestDate}</td>
                <td>{item.requestPurpose}</td>
                <td>{item.specificType}</td>
                <td>
                  <input
                    type="date"
                    value={dateDelivered[item.requestId] || ''}
                    onChange={(e) => handleDateChange(item.requestId, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="file"
                    onChange={(e) => handleImageChange(item.requestId, e.target.files[0])}
                  />
                </td>
                <td>
                  <button onClick={() => handleUpdate(item.requestId)}>Update</button>
                  <button onClick={() => handleDelete(item.requestId)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No items submitted yet.</p>
      )}
    </div>
  );
};

export default ManageItem;