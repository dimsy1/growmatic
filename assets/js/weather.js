document.addEventListener('DOMContentLoaded', function() {
    const tempElement = document.getElementById('outside-temp');
    
    // Fungsi untuk mendapatkan lokasi pengguna dan data cuaca
    function getWeatherByLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    
                    try {
                        // Ganti dengan API cuaca yang Anda gunakan
                        const apiKey = '040cb215c1aeeb20f1c9495c092366c4'; // Dapatkan dari penyedia API cuaca
                        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
                        
                        const response = await fetch(apiUrl);
                        const data = await response.json();
                        
                        if (data.main && data.main.temp) {
                            const temperature = Math.round(data.main.temp);
                            tempElement.textContent = `${temperature}°`;
                            
                            // Update icon berdasarkan kondisi cuaca
                            updateWeatherIcon(data.weather[0].main);
                        }
                    } catch (error) {
                        console.error('Error fetching weather data:', error);
                        setDefaultWeather();
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setDefaultWeather();
                }
            );
        } else {
            console.log('Geolocation is not supported by this browser.');
            setDefaultWeather();
        }
    }
    
    // Fungsi untuk mengupdate ikon cuaca
    function updateWeatherIcon(weatherCondition) {
        const iconElement = document.querySelector('.weather-info i.fas');
        
        // Hapus semua kelas ikon sebelumnya
        iconElement.className = 'fas';
        
        // Tambahkan kelas ikon berdasarkan kondisi cuaca
        switch (weatherCondition.toLowerCase()) {
            case 'clear':
                iconElement.classList.add('fa-sun');
                break;
            case 'clouds':
                iconElement.classList.add('fa-cloud');
                break;
            case 'rain':
                iconElement.classList.add('fa-cloud-rain');
                break;
            case 'snow':
                iconElement.classList.add('fa-snowflake');
                break;
            case 'thunderstorm':
                iconElement.classList.add('fa-bolt');
                break;
            default:
                iconElement.classList.add('fa-cloud');
        }
    }
    
    // Fungsi untuk menetapkan cuaca default jika ada error
    function setDefaultWeather() {
        tempElement.textContent = '--°'; // Nilai default
        document.querySelector('.weather-info i.fas').className = 'fas fa-cloud';
    }
    
    // Panggil fungsi saat halaman dimuat
    getWeatherByLocation();
});