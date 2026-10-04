import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '20s',
};

export default function () {
  http.get('http://localhost:5000/api/v1/seller-services');
  sleep(1);
}