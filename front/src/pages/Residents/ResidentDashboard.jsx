import React from "react";
import { useNavigate } from "react-router-dom";
import ResidentNavbar from "./ResidentNavbar";

export default function ResidentDashboard() {
  const navigate = useNavigate();

  return (
    <>
      <ResidentNavbar />
    </>
  );
}
