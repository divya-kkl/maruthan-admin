import React, { useState, useEffect } from 'react';
import { GraphQLClient, gql } from 'graphql-request';
import { FaEdit, FaTrash, FaPlus, FaCreditCard } from 'react-icons/fa';
import './PaymentMethod.css';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:2000/graphql";
const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    authorization: `Bearer ${localStorage.getItem('jwtToken')}`
  }
});

const GET_ALL_PAYMENT_METHODS = gql`
  query GetAllPaymentMethods {
    getAllPaymentMethods {
      id
      name
      value
      description
      icon
      status
      sortOrder
      createdAt
    }
  }
`;

const CREATE_PAYMENT_METHOD = gql`
  mutation CreatePaymentMethod($input: CreatePaymentMethodInput!) {
    createPaymentMethod(input: $input) {
      id
    }
  }
`;

const UPDATE_PAYMENT_METHOD = gql`
  mutation UpdatePaymentMethod($id: ID!, $input: UpdatePaymentMethodInput!) {
    updatePaymentMethod(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_PAYMENT_METHOD = gql`
  mutation DeletePaymentMethod($id: ID!) {
    deletePaymentMethod(id: $id)
  }
`;

const defaultForm = {
  name: '',
  value: '',
  description: '',
  icon: '💳',
  status: 'ACTIVE',
  sortOrder: '0'
};

function PaymentMethod() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const data = await client.request(GET_ALL_PAYMENT_METHODS);
      setMethods(data.getAllPaymentMethods || []);
    } catch (err) {
      console.error("Error fetching payment methods:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleOpenModal = (method = null) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        value: method.value,
        description: method.description || '',
        icon: method.icon || '💳',
        status: method.status,
        sortOrder: method.sortOrder?.toString() || '0'
      });
    } else {
      setEditingMethod(null);
      setFormData(defaultForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked ? 'ACTIVE' : 'INACTIVE' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.value.trim()) {
      alert("Name and Value are required.");
      return;
    }
    try {
      const input = {
        name: formData.name.trim(),
        value: formData.value.trim().toUpperCase(),
        description: formData.description.trim(),
        icon: formData.icon.trim() || '💳',
        status: formData.status,
        sortOrder: parseInt(formData.sortOrder) || 0
      };

      if (editingMethod) {
        await client.request(UPDATE_PAYMENT_METHOD, { id: editingMethod.id, input });
      } else {
        await client.request(CREATE_PAYMENT_METHOD, { input });
      }
      handleCloseModal();
      fetchMethods();
    } catch (err) {
      console.error("Error saving payment method:", err);
      const rawMsg = err?.response?.errors?.[0]?.message || err.message || '';
      if (rawMsg.includes('E11000') || rawMsg.includes('duplicate key')) {
        alert(`❌ A payment method with the value "${formData.value.trim().toUpperCase()}" already exists.\n\nPlease use a different Value/Key (e.g. ONLINE_PAY, CARD, etc.) or edit the existing one.`);
      } else {
        alert("Failed to save payment method. " + rawMsg);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment method?")) {
      try {
        await client.request(DELETE_PAYMENT_METHOD, { id });
        fetchMethods();
      } catch (err) {
        console.error("Error deleting payment method:", err);
        alert("Failed to delete payment method.");
      }
    }
  };

  const handleToggleStatus = async (method) => {
    const newStatus = method.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await client.request(UPDATE_PAYMENT_METHOD, {
        id: method.id,
        input: { status: newStatus }
      });
      fetchMethods();
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  if (loading && methods.length === 0) return <div className="pm-loading">Loading payment methods...</div>;

  return (
    <div className="pm-container">
      <div className="pm-header">
        <h2><FaCreditCard className="pm-header-icon" /> Payment Methods</h2>
        <button className="pm-add-btn" onClick={() => handleOpenModal()}>
          <FaPlus /> Add Payment Method
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="pm-empty">
          <FaCreditCard className="pm-empty-icon" />
          <p>No payment methods yet.</p>
          <p>Click "Add Payment Method" to create the first one.</p>
        </div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Icon &amp; Name</th>
              <th>Value (Key)</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method.id}>
                <td className="pm-sort-order">{method.sortOrder}</td>
                <td>
                  <div className="pm-name-cell">
                    <span className="pm-icon">{method.icon}</span>
                    <span className="pm-name">{method.name}</span>
                  </div>
                </td>
                <td><code className="pm-value-code">{method.value}</code></td>
                <td className="pm-desc">{method.description || '—'}</td>
                <td>
                  <button
                    className={`pm-status-toggle ${method.status === 'ACTIVE' ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleStatus(method)}
                    title="Click to toggle status"
                  >
                    {method.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="pm-actions">
                  <button className="pm-edit-btn" onClick={() => handleOpenModal(method)} title="Edit">
                    <FaEdit />
                  </button>
                  <button className="pm-delete-btn" onClick={() => handleDelete(method.id)} title="Delete">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="pm-modal-overlay" onClick={handleCloseModal}>
          <div className="pm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h2><FaCreditCard className="pm-modal-icon" /> {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</h2>
              <button className="pm-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="pm-form">
              <div className="pm-form-row">
                <div className="pm-form-group">
                  <label>Icon (Emoji) *</label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleChange}
                    placeholder="e.g. 💵"
                    maxLength={4}
                    required
                  />
                </div>
                <div className="pm-form-group pm-form-group-grow">
                  <label>Display Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Cash on Delivery"
                    required
                  />
                </div>
              </div>

              <div className="pm-form-group">
                <label>Value / Key * <span className="pm-hint">(will be stored in orders - use UPPERCASE, e.g. COD, UPI)</span></label>
                <input
                  type="text"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder="e.g. COD"
                  required
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="pm-form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g. Pay at your doorstep"
                />
              </div>

              <div className="pm-form-group">
                <label>Sort Order <span className="pm-hint">(lower = shown first)</span></label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="pm-form-group pm-status-group">
                <label className="pm-checkbox-label">
                  <input
                    type="checkbox"
                    name="status"
                    checked={formData.status === 'ACTIVE'}
                    onChange={handleChange}
                  />
                  Active (visible to customers on checkout)
                </label>
              </div>

              <div className="pm-modal-actions">
                <button type="button" className="pm-cancel-btn" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="pm-save-btn">
                  {editingMethod ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentMethod;
