import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from 'react-router-dom';
import { Helmet } from "react-helmet";
import useAuth from '../../useAuth';
import { Text, Button, Heading, Img, GoogleMap, TextArea } from "../../components";
import { ReactTable } from "../../components/ReactTable";
import { createColumnHelper } from "@tanstack/react-table";

const table1Data = [
  { description: "New Cabinets", "time-zone": "$1400", rentincrease: "$400 / month" },
  { description: "New Sink", "time-zone": "$300", rentincrease: "$50 / month" },
  { description: "New Carpet", "time-zone": "$500", rentincrease: "$100 / month" },
];
const baseUrl = import.meta.env.VITE_REACT_APP_API_BASE_URL;

const PROPERTY_STATE = {
  SAVE_PROPERTY: 'Save Property',
  SAVED: 'Saved',
  UN_SAVE: 'Un Save'
};
export default function PropertyPage() {
  const location = useLocation();
  const [cash, setCash] = useState(0);
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });
  const { authFetch, token } = useAuth();
  const property = location.state.property;
  const [rentType, setRentType] = useState('Monthly');
  const [notes, setNotes] = useState('');
  const [expensesType, setExpensesType] = useState('Monthly');
  const apiKey = 'AIzaSyDHWnXUqPoF5Qtfvizr-HqElkfn-af6uB8';
  const [streetViewImage, setStreetViewImage] = useState(null);
  const [savePropertyVar, setSavePropertyVar] = useState(PROPERTY_STATE.SAVE_PROPERTY);
  const [markers, setMarkers] = useState([]);
  const [viewType, setViewType] = useState('Streetview');
  const [livingInCurrentUnit, setLivingInCurrentUnit] = useState(false);
  const [previousRent, setPreviousRent] = useState(property.income.monthly_rent_unit_1);
  const [view, setView] = useState("monthly"); // Default view is monthly
  const [expenses, setExpenses] = useState({ ...property.expenses });

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const handleInputChange = (e, field) => {
    const value = parseFloat(e.target.value) || 0;
    setExpenses((prevExpenses) => ({
      ...prevExpenses,
      [field]: {
        ...prevExpenses[field],
        [view]: value,
      },
    }));
  };

  const streetViewRef = useRef(null);


  useEffect(() => {
    setNotes(property?.notes)
    setCash(property?.cash)

    if (property.isSaved)
      setSavePropertyVar(PROPERTY_STATE.UN_SAVE)
    else
      setSavePropertyVar(PROPERTY_STATE.SAVE_PROPERTY)

    if (property.latitude && property.longitude) {
      console.log("Latitude:", property.latitude);
      console.log("Longitude:", property.longitude);

      setCurrentLocation({
        lat: Number(property.latitude),
        lng: Number(property.longitude),
      });

      const markers = [property].map((property) => ({
        lat: parseFloat(property.latitude),
        lng: parseFloat(property.longitude),
        icon: "https://example.com/blue-dot.png", // replace with a valid URL
        info: `<div><strong>${property.formattedAddress}</strong><br>Unit Count: ${property.unitCount}</div>`
      }));

      if (livingInCurrentUnit) {
        setIncome((prevIncome) => ({ ...prevIncome, monthly_rent_unit_1: 0 }));
      } else {
        setIncome((prevIncome) => ({ ...prevIncome, monthly_rent_unit_1: previousRent }));
      }

      setMarkers(markers);
    }
  }, [property, livingInCurrentUnit]);

  const [income, setIncome] = useState(property.income);
  const [totalMonthlyRent, setTotalMonthlyRent] = useState(0);
  const [totalAnnualRent, setTotalAnnualRent] = useState(0);

  useEffect(() => {
  
    calculateTotals(income);
  }, [income], );

  useEffect(() => {
    const totalMonthly = Object.keys(expenses).reduce((acc, key) => {
      if (key !== "total_expenses" && key !== "vacancy_loss") {
        return acc + (parseFloat(expenses[key].monthly) || 0);
      }
      return acc;
    }, 0);

    const totalAnnual = Object.keys(expenses).reduce((acc, key) => {
      if (key !== "total_expenses" && key !== "vacancy_loss") {
        return acc + (parseFloat(expenses[key].annual) || 0);
      }
      return acc;
    }, 0);

    const price = property.price || 0;
    const vacancyRate = parseFloat(expenses.vacancy_rate[view]) || 0;
    const vacancyLossMonthly = (price * vacancyRate) / 100 / 12;
    const vacancyLossAnnual = (price * vacancyRate) / 100;

    setExpenses((prevExpenses) => ({
      ...prevExpenses,
      vacancy_loss: {
        monthly: round(vacancyLossMonthly, 2),
        annual: round(vacancyLossAnnual, 2),
      },
      total_expenses: {
        monthly: totalMonthly + vacancyLossMonthly,
        annual: totalAnnual + vacancyLossAnnual,
      },
    }));
  }, [
    expenses.mortgage,
    expenses.property_taxes,
    expenses.insurance,
    expenses.management,
    expenses.repairs,
    expenses.maintenance,
    expenses.improvements,
    expenses.heat,
    expenses.electric,
    expenses.water_and_sewer,
    expenses.other,
    expenses.vacancy_rate,
    property.price
  ]);

  const round = (value, decimals) => {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
  };



  const handleRentChange = (e, key) => {
    const updatedIncome = {
      ...income,
      [key]: parseFloat(e.target.value.replace(/[^\d]/g, '')) || 0
    };
    setIncome(updatedIncome);
  };

  const calculateTotals = (income) => {
    const monthlyRentKeys = Object.keys(income).filter(key => key.startsWith('monthly_rent_unit_'));
    const totalMonthly = monthlyRentKeys.reduce((acc, key) => acc + income[key], 0);
    const totalAnnual = totalMonthly * 12;
    setTotalMonthlyRent(totalMonthly);
    setTotalAnnualRent(totalAnnual);
  };

  const logout = async () => {
    try {
      const response = await authFetch(
        `${baseUrl}/api/logout/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.detail === "Successfully logged out.") {
        localStorage.removeItem('token'); // example
        window.location.href = '/'; // redirect to /login

      }
    } catch (error) {
      console.error('Error Logging out:', error);
    }

  }


  useEffect(() => {
    const initializeStreetView = () => {
      if (window.google && streetViewRef.current) {
        new window.google.maps.StreetViewPanorama(
          streetViewRef.current,
          {
            position: { lat: parseFloat(property.latitude), lng: parseFloat(property.longitude) },
            pov: { heading: 165, pitch: 0 },
            zoom: 1,
          }
        );
      }
    };

    if (window.google) {
      initializeStreetView();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeStreetView;
      document.head.appendChild(script);
    }
  }, [property.latitude, property.longitude]);

  const handleRentTypeChange = useCallback((type) => {
    setRentType(type);
  }, [rentType]);

  const handleExensesTypeChange = useCallback((type) => {
    setExpensesType(type);
  }, [expensesType]);

  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  const handleSaveProperty = async () => {

    property.notes = notes
    property.isSaved = true
    property.isLiving = livingInCurrentUnit

    try {
      const response = await authFetch(
        `${baseUrl}/property/save-property/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(property),
        }
      );
      console.log("th", property)

      const data = await response.json();
      console.log(data);

      if (response.message === "Property saved successfully") {
        // alert("Property saved successfully");
        setSavePropertyVar(PROPERTY_STATE.SAVED)
      } else {
        // alert("Failed to save property: " + data.error);
        setSavePropertyVar(PROPERTY_STATE.SAVED)

      }
    } catch (error) {
      setSavePropertyVar(PROPERTY_STATE.SAVED)
      // console.error("Error saving property:", error);
      // alert("An error occurred while saving the property.");
    }
  };

  const handleUnSaveProperty = async () => {
    try {
      const response = await authFetch(
        `${baseUrl}/property/unsave-property/`, // removed extra slash
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ property_id: property.id }), // send only property_id
        }
      );

      const data = await response.json();
      console.log(data);

      if (data.message === "Property unsaved successfully") {
        setSavePropertyVar(PROPERTY_STATE.SAVE_PROPERTY)
      } else {
        // alert("Failed to unsave property: " + data.error);
        setSavePropertyVar(PROPERTY_STATE.SAVE_PROPERTY)
      }
    } catch (error) {
      setSavePropertyVar(PROPERTY_STATE.SAVE_PROPERTY)
      // console.error("Error unsaving property:", error);
      // alert("An error occurred while unsaving the property.");
    }
  };

  console.log("in property", property)
  const table1Columns = React.useMemo(() => {
    const table1ColumnHelper = createColumnHelper();
    return [
      table1ColumnHelper.accessor("description", {
        cell: (info) => (
          <Text as="p" className="!text-gray-700">
            {info?.getValue?.()}
          </Text>
        ),
        header: (info) => (
          <Text as="p" className="px-px py-1.5 !font-medium">
            Description
          </Text>
        ),
        meta: { width: "266px" },
      }),
      table1ColumnHelper.accessor("time-zone", {
        cell: (info) => <Text as="p">{info?.getValue?.()}</Text>,
        header: (info) => (
          <Text as="p" className="py-1.5 !font-medium">
            Cost{" "}
          </Text>
        ),
        meta: { width: "186px" },
      }),
      table1ColumnHelper.accessor("rentincrease", {
        cell: (info) => (
          <div className="flex justify-between items-start gap-5 flex-1">
            <Text as="p" className="mt-[3px]">
              <span className="text-green-A400_01">$400</span>
              <span className="text-gray-900">&nbsp;</span>
              <span className="text-gray-700">/ month</span>
            </Text>
            <Img src="images/img_vector_24.svg" alt="vectortwentythr" className="h-[16px]" />
          </div>
        ),
        header: (info) => (
          <Text as="p" className="py-1.5 !font-medium">
            Rent Increase
          </Text>
        ),
        meta: { width: "265px" },
      }),
    ];
  }, []);

  return (
    <>
      <Helmet>
        <title>Doors</title>
        <meta name="description" content="Web site created using create-react-app" />
      </Helmet>
      <div className="flex flex-col w-full pt-[25px] gap-[101px] md:gap-[75px] sm:gap-[50px] sm:pt-5 bg-white-A700">
        <div className="w-full mx-auto md:p-5 max-w-[1175px]">
          <div className="flex md:flex-col justify-center items-start gap-[35px]">
            <div className="flex flex-col gap-[21px] flex-1">
              <div ref={streetViewRef} style={{ width: '100%', height: '400px' }} className="sm:w-full sm:h-auto z-[1] rounded-lg"></div>


              <div>

                <div className="flex md:flex-col justify-center gap-[30px]">
                  <div className="flex flex-col w-full gap-[21px]">
                    <div className="flex flex-col gap-[11px] p-6 sm:p-5 border-gray-200 border border-solid bg-white-A700 rounded-[12px]">

                      <div>
                        <div className="flex justify-between items-center gap-5">
                          <Heading as="h1">Income</Heading>
                          <div className="flex justify-center gap-1.5">
                            <Text
                              size="md"
                              as="p"
                              className="flex justify-center items-center h-[28px] px-2.5 py-[3px] !text-blue-500 text-center !font-medium border-blue-500 border border-solid bg-gray-100 rounded"
                              onClick={() => handleRentTypeChange('Monthly')}
                            >
                              Monthly
                            </Text>
                            <Button
                              color="gray_100_01"
                              variant="outline"
                              shape="round"
                              className="font-medium min-w-[78px]"
                              onClick={() => handleRentTypeChange('Annual')}
                            >
                              Annual
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-[7px]">
                        {Object.keys(income).filter(key => key.startsWith('monthly_rent_unit_')).map((key, index) => (
                          <div key={index} className="flex justify-between w-[74%] md:w-full gap-5">
                            <Text as="p" className="!text-gray-700">
                              Rent {index + 1}:
                            </Text>
                            <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                              <input
                                type="text"
                                value={
                                  rentType === 'Monthly'
                                    ? formatCurrency(income[key])
                                    : formatCurrency(income[key] * 12)
                                }
                                onChange={(e) => handleRentChange(e, key)}
                                className="mr-[3px] md:mr-0 text-right p-1 outline-none bg-transparent"
                              />
                            </div>
                          </div>
                        ))}
                        <div className="h-px bg-gray-100_01 rounded-[1px]" />
                        <div className="flex justify-between w-[74%] md:w-full gap-5">
                          <Text as="p" className="!text-gray-700">
                            Other income:
                          </Text>
                          <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                            <Text as="p" className="mr-[3px] md:mr-0 text-right">
                              0
                            </Text>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between gap-5">
                        <Text size="md" as="p" className="!font-medium">
                          Total Income
                        </Text>
                        <Text size="md" as="p" className="text-center !font-medium">
                          {rentType === 'Monthly'
                            ? formatCurrency(totalMonthlyRent)
                            : formatCurrency(totalAnnualRent)
                          }
                        </Text>
                      </div>
                    </div>
                    <div className="p-[21px] sm:p-5 border-gray-200 border border-solid bg-white-A700 rounded-[12px]">
                      <div className="flex flex-col mt-[5px] mb-1">
                        <Heading as="h2">Mortgage</Heading>
                        <div className="h-px mt-[3px] bg-gray-100_01 rounded-[1px]" />
                        <div className="flex justify-between mt-[13px] gap-5">
                          <Text as="p" className="!text-gray-700">
                            Rate
                          </Text>
                          <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                            <Text as="p" className="mr-[3px] md:mr-0 text-right">

                              {
                                (property?.mortgage?.mortgage_rate || 0)

                              }%
                            </Text>
                          </div>
                        </div>
                        <div className="flex justify-between mt-[7px] gap-5">
                          <Text as="p" className="self-end mt-[3px] !text-gray-700">
                            Length
                          </Text>
                          <div className="flex self-start justify-center border-blue-500 border border-dashed bg-white-A700 rounded">
                            <Text as="p" className="text-right">
                              30 Years
                            </Text>
                          </div>
                        </div>
                        <div className="flex justify-between mt-1.5 gap-5">
                          <Text as="p" className="self-end !text-gray-700">
                            Amount
                          </Text>
                          <Text as="p" className="self-start">
                            {
                              formatCurrency(property?.mortgage?.mortgage_amount || 0)

                            }
                          </Text>
                        </div>
                        <div className="flex justify-between mt-[3px] gap-5">
                          <Text as="p" className="self-end mt-[3px] !text-gray-700">
                            Monthly Payment
                          </Text>
                          <Text as="p" className="self-start">
                            {
                              formatCurrency(property?.mortgage?.monthly_payment || 0)
                            }
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col w-full gap-[9px] p-[13px] border-gray-200 border border-solid bg-white-A700 rounded-[12px]">
      <div className="mt-[11px]">
        <div className="flex justify-between items-center gap-5">
          <h3 className="self-end">Expenses</h3>
          <div className="flex self-start justify-center mb-0.5 gap-1.5">
            <p
              onClick={() => handleViewChange("monthly")}
              className={`px-2.5 py-[3px] !text-gray-700 text-center !font-medium border-gray-100_01 border border-solid rounded cursor-pointer ${
                view === "monthly" ? "bg-blue-500 text-white" : ""
              }`}
            >
              Monthly
            </p>
            <button
              onClick={() => handleViewChange("annual")}
              className={`font-medium border-blue-500 border border-solid min-w-[78px] rounded-full cursor-pointer ${
                view === "annual" ? "bg-blue-500 text-white" : ""
              }`}
            >
              Annual
            </button>
          </div>
        </div>
      </div>
      <div>
        {Object.keys(expenses).map(
          (key) =>
            key !== "total_expenses" &&
            key !== "vacancy_loss" && (
              <div key={key}>
                <div className="flex justify-between mt-1 gap-5">
                  <p className="!text-gray-700">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}:</p>
                  <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                    <input
                      type="number"
                      value={expenses[key][view]}
                      onChange={(e) => handleInputChange(e, key)}
                      className="mr-[3px] md:mr-0 text-right"
                    />
                  </div>
                </div>
                <div className="h-px mt-[3px] bg-gray-100_01 rounded-[1px]" />
              </div>
            )
        )}
        <div className="flex justify-between mt-1 gap-5">
          <p className="self-end !text-gray-700">Vacancy Loss:</p>
          <p className="self-start text-right">{formatCurrency(expenses.vacancy_loss[view] || 0)}</p>
        </div>
        <div className="flex justify-between mt-1 gap-5">
          <p className="self-end !text-gray-700">Total Expenses:</p>
          <p className="self-start text-right">
            {formatCurrency(expenses.total_expenses[view] || 0)}
          </p>
        </div>
      </div>
    </div>

                </div>
              </div>
              <input
                className="w-1/2 relative leading-[20px] inline-block shrink-0"
                type="text"
                placeholder="Personal Notes"
                name="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              />


              {/* <TextArea
  shape="round"
  name="notes"
  placeholder={`Personal Notes`}
  className="sm:p-5 text-gray-900 font-semibold"
  // value={notes}
  onChange={(e) => {
    setNotes(e.target.value);
    console.log(notes); // check if notes is being updated
  }}
/> */}
              <GoogleMap showMarker={false} center={currentLocation} zoom={10}
                markers={markers} className="h-[370px] rounded-[16px]" />
            </div>
            <div className="flex flex-col items-end w-[32%] md:w-full gap-2">
              <div className="flex justify-end w-[38%] md:w-full mr-[125px] md:mr-0">
                <div className="flex justify-end items-start w-full gap-3">
                  <div className="h-[47px] flex-1 relative">
                    <div className="flex flex-col w-[21%] gap-[3px] right-[22%] top-[6%] m-auto absolute">
                      <div className="h-[7px] w-[7px] rotate-[90deg] bg-gray-50_01 rounded-[1px]" />
                      <div className="h-[7px] w-[7px] rotate-[90deg] bg-gray-50_01 rounded-[1px]" />
                    </div>
                    <div className="w-[93%] h-full left-0 bottom-0 top-0 my-auto absolute">
                      <div className="flex flex-col">
                        <Img src="images/img_rectangle_134.svg" alt="image_one" className="h-[47px] rounded-[3px]" />
                        <div className="h-[47px] mt-[-47px] relative">
                          <Img
                            src="images/img_rectangle_135.svg"
                            alt="image_two"
                            className="justify-center h-[47px] left-0 bottom-0 right-0 top-0 m-auto absolute rounded-[3px]"
                          />
                          <div className="flex flex-col items-start w-[61%] left-[12%] top-[11%] m-auto absolute">
                            <div className="flex">
                              <Img
                                src="images/img_rectangle_139.svg"
                                alt="image_three"
                                className="h-[9px] w-[9px] mt-[5px] mb-0.5 z-[2] rounded-[1px]"
                              />
                              <Img
                                src="images/img_rectangle_139.svg"
                                alt="image_four"
                                className="h-[9px] w-[9px] ml-[-1px] z-[1] rounded-[1px]"
                              />
                              <Img
                                src="images/img_rectangle_139.svg"
                                alt="image_five"
                                className="h-[9px] w-[9px] ml-[-3px] rounded-[1px]"
                              />
                            </div>
                            <Img
                              src="images/img_rectangle_139.svg"
                              alt="image_six"
                              className="h-[9px] w-[9px] mt-[-3px] ml-[5px] md:ml-0 rounded-[1px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-[53%] right-0 top-0 p-[3px] m-auto border-white-A700 border border-solid bg-blue-500 absolute rounded-[3px]">
                      <div className="flex flex-col items-end mb-[9px] gap-[3px]">
                        <div className="flex self-stretch justify-end gap-[3px]">
                          <div className="h-[6px] w-[6px] rotate-[90deg] bg-gray-50_01 rounded-[1px]" />
                          <div className="h-[6px] w-[6px] rotate-[90deg] bg-gray-50_01 rounded-[1px]" />
                        </div>
                        <div className="flex self-stretch justify-end gap-[3px]">
                          <div className="h-[6px] w-[6px] rotate-[90deg] bg-gray-50_01 rounded-[1px]" />
                          <div className="h-[6px] w-[6px] rotate-[90deg] bg-gray-50_01 rounded-[1px]" />
                        </div>
                        <div className="h-[3px] w-[3px] bg-white-A700 rounded-[1px]" />
                      </div>
                    </div>
                  </div>
                  <Heading size="xs" as="p" className="mt-3 !text-gray-800">
                    Doors
                  </Heading>
                </div>
              </div>
              <div className="self-stretch p-5 border-gray-200 border border-solid bg-white-A700 rounded-[12px]">
                <div className="flex flex-col items-start mb-[3px]">
                  <div className="flex justify-between gap-5">
                    <Text as="p" className="!text-gray-700">
                      View Type:
                    </Text>
                    <div className="flex justify-end">
                      <Button
                        shape="round"
                        className={`font-medium min-w-[78px] ${viewType === 'Streetview' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setViewType('Streetview')}
                      >
                        Streetview
                      </Button>
                      <Button
                        shape="round"
                        className={`font-medium min-w-[78px] ${viewType === 'Map' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setViewType('Map')}
                      >
                        Map
                      </Button>
                      <Button
                        shape="round"
                        className={`font-medium min-w-[78px] ${viewType === '3D' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setViewType('3D')}
                      >
                        3D
                      </Button>
                    </div>
                  </div>
                  <div className="flex self-stretch justify-between gap-5">
                    <Heading as="h6" className="self-start !font-bold">
                      List Price
                    </Heading>
                    <Heading as="h6" className="self-end text-right">
                      {/* {property?.formatCurrency(price)} */}
                      {
                        formatCurrency(property?.price)
                      }
                    </Heading>
                  </div>
                  <div className="flex self-stretch justify-between items-center gap-5">
                    <Text size="md" as="p" className="!text-gray-700">
                      Offer Price
                    </Text>
                    <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                      <Text as="p" className="self-end text-right">
                        {
                          formatCurrency(property?.offerPrice)
                        }
                      </Text>
                    </div>
                  </div>
                  <div className="self-stretch h-px mt-4 bg-gray-100_01 rounded-[1px]" />
                  <Text size="md" as="p" className="mt-[7px]">
                    {property?.formattedAddress}
                  </Text>
                  <div className="self-stretch mt-1">
                    <div className="flex flex-col gap-1">
                      <div className="h-px bg-gray-100_01 rounded-[1px]" />
                      <div className="flex justify-between gap-5">
                        <div className="flex self-start justify-center gap-[17px]">
                          <Text size="md" as="p" className="!text-gray-700">
                            Bedrooms:
                          </Text>
                          <Text size="md" as="p" className="text-right">
                            {property?.bedrooms ?? '?'}
                          </Text>
                        </div>
                        <div className="flex self-end justify-center mt-0.5 gap-1.5">
                          <Text size="md" as="p" className="!text-gray-700">
                            Bathrooms:
                          </Text>
                          <Text size="md" as="p" className="text-right">
                            {property?.bathrooms ?? '?'}
                          </Text>
                        </div>
                      </div>
                      <div className="h-px bg-gray-100_01 rounded-[1px]" />
                    </div>
                  </div>
                  <div className="flex self-stretch justify-between items-center mt-[3px] gap-5">
                    <div className="flex self-start justify-center gap-[11px]">
                      <Text size="md" as="p" className="self-end !text-gray-700">
                        Squarefeet:
                      </Text>
                      <Text size="md" as="p" className="self-start text-right">

                        {property?.squareFootage ?? '?'}
                      </Text>
                    </div>
                    <div className="flex self-end justify-center gap-[11px]">
                      <Text size="md" as="p" className="!text-gray-700">
                        Acres:
                      </Text>
                      <Text size="md" as="p" className="text-right">
                        1
                      </Text>
                    </div>
                  </div>
                  <div className="flex self-stretch justify-between mt-[50px] gap-5">
                    <Text size="md" as="p" className="!text-gray-700">
                      Units:
                    </Text>
                    <Text size="md" as="p" className="!text-black-900 text-right">
                      {property?.unitCount}
                    </Text>
                  </div>
                  <div className="flex justify-between gap-5">
                    <Text as="p" className="!text-gray-700">
                      Living in current unit:
                    </Text>
                    <div className="flex justify-end">
                      <Button
                        color={livingInCurrentUnit ? 'green' : 'gray'}
                        shape="round"
                        className={`font-medium min-w-[78px] ${livingInCurrentUnit ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setLivingInCurrentUnit(true)}
                      >
                        Yes
                      </Button>
                      <Button
                        color={!livingInCurrentUnit ? 'green' : 'gray'}
                        shape="round"
                        className={`font-medium min-w-[78px] ${!livingInCurrentUnit ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setLivingInCurrentUnit(false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                  <div className="self-stretch h-px mt-1.5 bg-gray-100_01 rounded-[1px]" />
                  <div className="flex self-stretch justify-between items-center mt-1 gap-5">
                    <Text size="md" as="p" className="!text-gray-700">
                      Annual Cash Flow:
                    </Text>
                    <Text
                      as="p"
                      className="flex justify-end items-end h-[26px] pl-[15px] pr-1 py-px !text-white-A700 text-right !font-medium bg-green-A400_01 rounded"
                    >
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      }).format(
                        (property?.annualCashFlow || 0)
                      )}
                    </Text>
                  </div>
                  <div className="self-stretch h-px mt-1 bg-gray-100_01 rounded-[1px]" />
                  <div className="flex self-stretch justify-between items-center mt-1 gap-5">
                    <Text size="md" as="p" className="!text-gray-700">
                      Annual Return on Cash:
                    </Text>
                    <Text
                      as="p"
                      className="flex justify-end items-end h-[26px] pl-8 pr-1 py-px sm:pl-5 !text-white-A700 text-right !font-medium bg-green-A400_01 rounded"
                    >
                      {new Intl.NumberFormat('en-US', {
                        style: 'percent',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(
                        (property?.returnOnCash || 0)
                      )}
                    </Text>
                  </div>
                  <div className="self-stretch h-px mt-1 bg-gray-100_01 rounded-[1px]" />
                  <div className="flex self-stretch justify-between items-center mt-1 gap-5">
                    <Text size="md" as="p" className="!text-gray-700">
                      Cash Used:
                    </Text>
                    <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                      <input
                        type="number"
                        value={cash}
                        onChange={(e) => setCash(e.target.valueAsNumber)}
                        className="self-end mr-[3px] md:mr-0 text-right"
                      />
                    </div>
                  </div>

                  <div className="self-stretch mt-1">
                    <div className="flex flex-col gap-1">
                      <div className="h-px bg-gray-100_01 rounded-[1px]" />
                      <div className="flex justify-between items-center gap-5">
                        <Text size="md" as="p" className="!text-gray-700">
                          % Down:
                        </Text>
                        <Text
                          as="p"
                          className="flex justify-end items-end h-[26px] pl-[35px] pr-1 py-px sm:pl-5 text-right bg-white-A700 rounded"
                        >
                          {new Intl.NumberFormat('en-US', {
                            style: 'percent',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format((cash / property?.price))}
                        </Text>
                      </div>
                    </div>
                  </div>
                  {/* <div className="flex self-stretch justify-between items-center mt-1 gap-5">
                    <Text size="md" as="p" className="!text-gray-700">
                      Cash Used:
                    </Text>
                    <div className="flex justify-end border-blue-500 border border-dashed bg-white-A700 rounded">
                      <Text as="p" className="self-end mr-[3px] md:mr-0 text-right">
                      {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(
          (property?.cash || 0) 
        )}
                      </Text>
                    </div>
                  </div>
                  <div className="self-stretch mt-1">
                    <div className="flex flex-col gap-1">
                      <div className="h-px bg-gray-100_01 rounded-[1px]" />
                      <div className="flex justify-between items-center gap-5">
                        <Text size="md" as="p" className="!text-gray-700">
                          % Down:
                        </Text>
                        <Text
                          as="p"
                          className="flex justify-end items-end h-[26px] pl-[35px] pr-1 py-px sm:pl-5 text-right bg-white-A700 rounded"
                        >
                          {new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(
          (property?.percentageDown || 0) 
        )}
                        </Text>
                      </div>
                    </div>
                  </div> */}
                  <div className="self-stretch h-[25px] mt-1 bg-white-A700 rounded" />
                  <Button
                    color="blue_500"
                    shape="round"
                    className="w-full mt-1 sm:px-5 !text-white-A700 border-blue-500 border border-solid"
                    onClick={() => {
                      savePropertyVar === PROPERTY_STATE.SAVE_PROPERTY
                        ? handleSaveProperty()
                        : handleUnSaveProperty();
                    }}

                  >
                    {savePropertyVar}
                  </Button>
                  <Button shape="round" className="w-full mt-1 sm:px-5 border-blue-500 border border-solid">
                    View Listing
                  </Button>
                  <Button shape="round" className="w-full mt-1 sm:px-5 border-blue-500 border border-solid">
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="p-4 bg-blue-500">
          <div className="flex md:flex-col justify-between items-center w-full mt-[18px] gap-5 mx-auto max-w-[1371px]">
            <Text as="p" className="mt-1 !text-white-A700 tracking-[0.32px]">
              © Doors 2024
            </Text>
            <div className="flex md:flex-col justify-center items-start w-[84%] md:w-full gap-[38px] md:p-5">
              <Text size="s" as="p" className="w-[63%] md:w-full !text-white-A700 tracking-[0.24px] !leading-[120%]">
                Terms and Conditions Privacy Policy
              </Text>
              <ul className="flex justify-between w-[37%] md:w-full mt-1 pr-[7px] gap-5">
                <li>
                  <a href="#" className="self-start mb-0.5">
                    <Text as="p" className="!text-white-A700 tracking-[0.32px] !font-medium">
                      Contact Us
                    </Text>
                  </a>
                </li>
                <li>
                  <a href="#">
                    <Text as="p" className="!text-white-A700 tracking-[0.32px] !font-medium">
                      Subscription
                    </Text>
                  </a>
                </li>
                <li>
                  <a href="#" className="self-end">
                    <button
                      onClick={logout}
                      className="!text-white-A700 tracking-[0.32px]!font-medium cursor-pointer"
                    >
                      Log Out
                    </button>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
