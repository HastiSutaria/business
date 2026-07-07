import { Link } from 'react-router-dom';

export default function NotFound(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-gray-400">This page doesn't exist.</p>
      <Link to="/" className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
