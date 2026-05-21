import SourceForm from '../SourceForm';

export default function NewSourcePage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--white)', marginBottom: 28 }}>
        New Source
      </h1>
      <SourceForm />
    </div>
  );
}
