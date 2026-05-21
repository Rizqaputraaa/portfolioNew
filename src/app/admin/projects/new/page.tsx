import ProjectForm from '../ProjectForm';

export default function NewProjectPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--white)', marginBottom: 28 }}>
        New Project
      </h1>
      <ProjectForm />
    </div>
  );
}
