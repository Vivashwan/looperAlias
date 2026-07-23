import React from "react";
import SideNav from "../_components/SideNav";
import EmptyDocumentState from "../_components/EmptyDocumentState";
import { Room } from "@/app/Room";

function Workspace({ params }) {
  return (
    <div>
      <Room params={params}>
        <SideNav params={params} />
        <div className="md:ml-72">
          <EmptyDocumentState params={params} />
        </div>
      </Room>
    </div>
  );
}

export default Workspace;
