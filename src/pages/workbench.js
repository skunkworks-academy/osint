import React from 'react';
import AnalystWorkspace from '../components/AnalystWorkspace';

/** Backward-compatible entry point for the expanded analyst workplace. */
export default function Workbench(){
  return <AnalystWorkspace view="overview" />;
}
