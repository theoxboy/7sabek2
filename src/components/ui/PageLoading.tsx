export function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-label="Page loading">
      <div className="page-loading__pencil" aria-hidden="true">
        <div className="page-loading__ball-point" />
        <div className="page-loading__cap" />
        <div className="page-loading__cap-base" />
        <div className="page-loading__middle" />
        <div className="page-loading__eraser" />
      </div>
      <div className="page-loading__line" aria-hidden="true" />
      <h2 className="page-loading__title">Page Loading...Please Wait</h2>
    </div>
  );
}
