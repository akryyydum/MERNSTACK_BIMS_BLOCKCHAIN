import "./InternalServerError.css";

export default function InternalServerError() {
  return (
    <div className="error-container">
      <h5>Internal Server error !</h5>

      <h1>5</h1>
      <h1 className="zero">00</h1>

      <div className="box">
        <span></span><span></span>
        <span></span><span></span>
        <span></span>
      </div>

      <div className="box second-box">
        <span></span><span></span>
        <span></span><span></span>
        <span></span>
      </div>

      <p>
        We're unable to find out what's happening! We suggest you to <br />
        <a href="#">Go Back</a> or visit here later.
      </p>
    </div>
  );
}
