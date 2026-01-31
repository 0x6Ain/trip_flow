import { useEffect, useState } from "react";
import type { Place } from "../../types/trip";

interface PlaceDetailModalProps {
  place: Place;
  onClose: () => void;
}

interface PlaceDetails {
  name: string;
  formattedAddress?: string;
  rating?: number;
  userRatingsTotal?: number;
  photos?: string[];
  editorialSummary?: string;
  website?: string;
  phoneNumber?: string;
}

export const PlaceDetailModal = ({ place, onClose }: PlaceDetailModalProps) => {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaceDetails = async () => {
      if (!window.google?.maps?.places) {
        setLoading(false);
        return;
      }

      try {
        const service = new google.maps.places.PlacesService(
          document.createElement("div")
        );

        service.getDetails(
          {
            placeId: place.placeId,
            fields: [
              "name",
              "formatted_address",
              "rating",
              "user_ratings_total",
              "photos",
              "editorial_summary",
              "website",
              "formatted_phone_number",
            ],
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              setDetails({
                name: result.name || place.name,
                formattedAddress: result.formatted_address,
                rating: result.rating,
                userRatingsTotal: result.user_ratings_total,
                photos: result.photos?.slice(0, 3).map((photo) => photo.getUrl({ maxWidth: 400 })),
                editorialSummary: result.editorial_summary?.overview,
                website: result.website,
                phoneNumber: result.formatted_phone_number,
              });
            }
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Failed to fetch place details:", error);
        setLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [place]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">장소 상세정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photos */}
              {details?.photos && details.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {details.photos.map((photoUrl, index) => (
                    <img
                      key={index}
                      src={photoUrl}
                      alt={`${details.name} ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Name */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {details?.name || place.name}
                </h3>
              </div>

              {/* Rating */}
              {details?.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 font-semibold">{details.rating}</span>
                  </div>
                  {details.userRatingsTotal && (
                    <span className="text-sm text-gray-500">
                      ({details.userRatingsTotal.toLocaleString()}개 리뷰)
                    </span>
                  )}
                </div>
              )}

              {/* Address */}
              {details?.formattedAddress && (
                <div className="flex items-start gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-600">{details.formattedAddress}</span>
                </div>
              )}

              {/* Editorial Summary */}
              {details?.editorialSummary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-700">{details.editorialSummary}</p>
                </div>
              )}

              {/* Phone */}
              {details?.phoneNumber && (
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <a
                    href={`tel:${details.phoneNumber}`}
                    className="text-blue-600 hover:underline"
                  >
                    {details.phoneNumber}
                  </a>
                </div>
              )}

              {/* Website */}
              {details?.website && (
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    웹사이트 방문
                  </a>
                </div>
              )}

              {/* Google Maps Link */}
              <div className="pt-4">
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${place.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Google Maps에서 보기
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
