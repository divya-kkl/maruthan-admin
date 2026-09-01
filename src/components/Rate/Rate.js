import React, { useState, useEffect, useCallback } from 'react';
import { GraphQLClient, gql } from 'graphql-request';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './Rate.css';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:2000/graphql";
const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    authorization: `Bearer ${localStorage.getItem('jwtToken')}`
  }
});

const GET_ALL_RATES = gql`
  query GetAllRates {
    getAllRates {
      id
      date
      name
      gram
      amount
      type
      isCurrent
      createdAt
      updatedAt
    }
  }
`;

const CREATE_RATE = gql`
  mutation CreateRate($input: RateInput!) {
    createRate(input: $input) {
      id
      date
      name
      gram
      amount
      type
      isCurrent
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_RATE = gql`
  mutation UpdateRate($updateRateId: ID!, $input: UpdateRateInput!) {
    updateRate(id: $updateRateId, input: $input) {
      id
      date
      name
      gram
      amount
      type
      isCurrent
      createdAt
      updatedAt
    }
  }
`;

const DELETE_RATE = gql`
  mutation DeleteRate($deleteRateId: ID!) {
    deleteRate(id: $deleteRateId)
  }
`;

function Rate() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    gram: 1,
    amount: '',
    type: '22K',
    isCurrent: true
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await client.request(GET_ALL_RATES);
      setRates(data.getAllRates || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const input = {
        date: formData.date,
        name: formData.name,
        gram: parseFloat(formData.gram),
        amount: parseFloat(formData.amount),
        type: formData.type,
        isCurrent: formData.isCurrent
      };

      if (currentRate) {
        await client.request(UPDATE_RATE, {
          updateRateId: currentRate.id,
          input
        });
        showToast('Rate updated successfully!');
      } else {
        await client.request(CREATE_RATE, { input });
        showToast('Rate created successfully!');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchRates();
    } catch (err) {
      const msg = err.response?.errors?.[0]?.message || err.message;
      showToast('Error saving rate: ' + msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this rate?')) {
      try {
        await client.request(DELETE_RATE, { deleteRateId: id });
        showToast('Rate deleted successfully!');
        fetchRates();
      } catch (err) {
        const msg = err.response?.errors?.[0]?.message || err.message;
        showToast('Error deleting rate: ' + msg, 'error');
      }
    }
  };

  const openEditModal = (rate) => {
    setCurrentRate(rate);
    setFormData({
      date: rate.date ? new Date(Number(rate.date) || rate.date).toISOString().split('T')[0] : '',
      name: rate.name,
      gram: rate.gram,
      amount: rate.amount,
      type: rate.type,
      isCurrent: rate.isCurrent
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setCurrentRate(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      name: '',
      gram: 1,
      amount: '',
      type: '22K',
      isCurrent: true
    });
  };

  return (
    <div className="tags-container">
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'error' ? '#f44336' : '#4caf50',
          color: 'white',
          padding: '16px',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          zIndex: 10000,
          fontWeight: '500',
          transition: 'opacity 0.3s',
        }}>
          {toastMessage}
        </div>
      )}

      <div className="tags-header">
        <h2>Manage Rates</h2>
        <button 
          className="add-btn"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <FaPlus /> Add New Rate
        </button>
      </div>

      {loading && <div className="loading">Loading rates...</div>}
      {error && <div className="error">{error.message}</div>}

      {!loading && !error && (
        <div className="table-responsive">
          <table className="tags-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Type</th>
                <th>Gram</th>
                <th>Amount</th>
                <th>Is Current</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length > 0 ? (
                rates.map((rate) => (
                  <tr key={rate.id}>
                    <td>{rate.date ? new Date(Number(rate.date) || rate.date).toLocaleDateString() : '-'}</td>
                    <td>{rate.name}</td>
                    <td>{rate.type}</td>
                    <td>{rate.gram}</td>
                    <td>₹{rate.amount}</td>
                    <td>
                      <span className={`status-badge ${rate.isCurrent ? 'active' : 'inactive'}`}>
                        {rate.isCurrent ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn edit" onClick={() => openEditModal(rate)} title="Edit">
                        <FaEdit />
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(rate.id)} title="Delete">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">No rates found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{currentRate ? 'Edit Rate' : 'Add New Rate'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name (e.g. 22K Gold) *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select name="type" value={formData.type} onChange={handleInputChange} required>
                  <option value="22K">22K Gold</option>
                  <option value="18K">18K Gold</option>
                  <option value="24K">24K Gold</option>
                  <option value="SILVER">Silver</option>
                  <option value="PLATINUM">Platinum</option>
                </select>
              </div>
              <div className="form-group">
                <label>Gram *</label>
                <input
                  type="number"
                  step="0.01"
                  name="gram"
                  value={formData.gram}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount (Price) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  name="isCurrent"
                  checked={formData.isCurrent}
                  onChange={handleInputChange}
                  style={{ width: 'auto' }}
                />
                <label style={{ marginBottom: 0 }}>Set as Current Rate</label>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {currentRate ? 'Update Rate' : 'Create Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rate;
