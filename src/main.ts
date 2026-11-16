import './style.css';
import { mountApp } from './ui/app';
import { initAppUpdate } from './update';

const root = document.getElementById('app');
if (!root) {
  throw new Error('#app root element not found — index.html is malformed');
}

mountApp(root);
initAppUpdate();
