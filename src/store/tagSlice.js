import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GraphQLClient, gql } from 'graphql-request';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:2000/graphql";

const getClient = () => {
  return new GraphQLClient(GRAPHQL_ENDPOINT, {
    headers: {
      authorization: `Bearer ${localStorage.getItem('jwtToken')}`
    }
  });
};

const GET_ALL_TAGS = gql`
  query GetAllTags($search: String, $page: Int, $limit: Int) {
    getAllTags(search: $search, page: $page, limit: $limit) {
      tags {
        id
        name
        code
        description
        status
        createdTime
      }
      totalCount
    }
  }
`;

export const fetchTags = createAsyncThunk(
  'tag/fetchTags',
  async ({ search, page, limit }) => {
    const client = getClient();
    const data = await client.request(GET_ALL_TAGS, { search, page, limit });
    return data.getAllTags;
  }
);

const initialState = {
  tags: [],
  totalCount: 0,
  loading: true,
  error: null,
  searchTerm: '',
  page: 1,
  limit: 10
};

const tagSlice = createSlice({
  name: 'tag',
  initialState,
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
      state.page = 1;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = action.payload?.tags || [];
        state.totalCount = action.payload?.totalCount || 0;
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { setSearchTerm, setPage } = tagSlice.actions;
export default tagSlice.reducer;
