export const API_ENDPOINT_HTTP = (process.env.NODE_ENV === 'production') ? 'https://routebackend.herokuapp.com' : 'http://localhost:8010'
export const API_ENDPOINT_WS = (process.env.NODE_ENV === 'production') ? 'wss://routebackend.herokuapp.com' : 'ws://localhost:8010'
