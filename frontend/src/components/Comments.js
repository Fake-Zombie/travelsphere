// Comments.js
import React from 'react';

function Comments({ destinationId }) {
  return (
    <div className="dp-comments">
      <h2>Comments for destination {destinationId}</h2>
      <p>(Comments will appear here)</p>
    </div>
  );
}

export default Comments;
