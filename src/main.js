import { createApp } from 'vue'
import axios from 'axios'
import './style.css'
import App from './App.vue'

// Configure axios
axios.defaults.baseURL = '/api'
axios.defaults.timeout = 10000

// Add request interceptor to include token
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Add response interceptor to handle errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

createApp(App).mount('#app')
