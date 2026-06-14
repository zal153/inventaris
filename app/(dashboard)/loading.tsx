import React from "react";

export default function Loading() {
  return (
    <div className="w-full space-y-6 p-1 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div className="h-10 w-32 rounded bg-gray-200 dark:bg-gray-700 sm:w-28"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2.5">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
            </div>
            <div className="mt-4 h-3 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        ))}
      </div>

      {/* Main Area Skeleton */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Side: Large Content/Table Skeleton */}
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                </div>
                <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Widget Skeleton */}
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div className="space-y-4 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-2.5 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
