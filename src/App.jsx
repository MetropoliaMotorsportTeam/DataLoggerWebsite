import { BrowserRouter as Router } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import AppRoutes from './routes/AppRoutes';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <AppRoutes />
      </Layout>
    </Router>
  );
}

export default App;